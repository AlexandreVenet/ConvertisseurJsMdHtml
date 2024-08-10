"use strict";

class Convertisseur
{	
	// Architecture : patron de conception State Machine.
	// Inconvénient : un tour de boucle peut être réservé au seul changement d'état.
	
	// Tableau des lignes du texte Markdown avec retour ligne pour séparateur
	tableauMd = [];
	
	// Index du tableau précédent en cours d'analyse
	indexActuel = 0;
	
	// le code HTML de sortie 
	html = '';
	
	// Etats de la State Machine 
	default = 0;
	titre1 = 1; // le numéro désigne le niveau, ex : h1, h2
	titre2 = 2;
	titre3 = 3;
	paragraphe = 4;
	preCode = 5;
	preCodeFin = 6;
	image = 7;
	imageLegende = 8;
	liste = 9;
	tableEnTete = 10;
	tableStructure = 11;
	tableLigne = 12;
	citation = 13;
	// Etat actuel
	etat = this.default;
	
	// Séquences d'échappement
	/*
		Unix/Linux/Mac OS (après OS X) utilisent \n pour la fin de ligne.
		Windows utilise \r\n.
		Mac OS (avant OS X) utilisait \r.
	*/
	carriageReturn = '\r';
	newLine = '\n'; 
	
	// Contenu d'un <pre><code>
	contenuPreCode = '';
	
	// img
	figure;
	
	// listes
	listeRacine; 
	listePile = []; // Pile pour gérer les listes imbriquées, index 0 est le niveau racine
	
	// Les tables
	tableHeader;
	tableTemp;
	
	
	analyser = (md) =>
	{
		// Le Markdown est structuré en lignes. Les récupérer en tableau
		this.tableauMd = md.trim().split(this.newLine);
		
		while (this.indexActuel < this.tableauMd.length) 
		{
			let ligne = this.tableauMd[this.indexActuel];
			ligne = ligne.replace(this.carriageReturn, ''); // sans ça, pas de <pre><code>
			
			switch (this.etat) 
			{
				case this.default:
					if(ligne.length == 0) // ligne vide 
					{
						this.passerALaLigneSuivante();
						break;
					}
					if(ligne.substring(0,2) === '# ') // <h1>
					{
						this.etat = this.titre1;
						break;
					}
					if(ligne.substring(0,3) === '## ') // <h2>
					{
						this.etat = this.titre2; 
						break;
					}
					if(ligne.substring(0,4) === '### ') // <h3>
					{
						this.etat = this.titre3; 
						break;
					}
					if(ligne.substring(0,3) === '```') // <pre><code>
					{
						this.passerALaLigneSuivante();
						this.etat = this.preCode;
						break;
					}
					if(ligne.substring(0,2) === '![') // <img>
					{
						this.etat = this.image;
						break;
					}
					const testMatchListe = ligne.match(/^(-|[0-9]+\.)\s/);
					if(testMatchListe)
					{
						this.listeRacine = (testMatchListe[1] === '-') ? 'ul':'ol';
						this.html += `<${this.listeRacine}>`;
						this.listePile = [this.listeRacine];
						this.etat = this.liste;
						break;
					}
					if(/^(\s*[^|]*\s*\|)+\s*[^|]*\s*$/.test(ligne))
					{
						this.etat = this.tableEnTete;
						break;
					}
					if(ligne.substring(0,2) === '> ')
					{
						this.html += '<figure><blockquote>';
						this.etat = this.citation;
						break;
					}
					// Tout autre cas est p
					this.etat = this.paragraphe; 
					break;
				case this.titre1:
				case this.titre2:
				case this.titre3:
					const contenuH = this.obtenirLigneSansPrefixe(ligne);
					const titre = this.formaterTitre(contenuH);
					this.html += `<h${this.etat}>${titre}</h${this.etat}>`;
					this.passerALaLigneSuivante();
					this.etat = this.default;
					break;
				case this.paragraphe:
					this.html += `<p>${this.formaterTexte(ligne)}</p>`;
					this.passerALaLigneSuivante();
					this.etat = this.default;
					break;
				case this.preCode:
					if(ligne === '```')
					{
						this.contenuPreCode = this.contenuPreCode.slice(0,-1); // on ne veut pas du \n final
						this.etat = this.preCodeFin;
					}
					else
					{
						const linePreCode = this.convertirEnEntities(ligne);
						this.contenuPreCode += linePreCode + this.newLine;
						this.passerALaLigneSuivante();
					}
					break;
				case this.preCodeFin:
					this.html += `<pre><code>${this.contenuPreCode}</code></pre>`;
					this.contenuPreCode = '';
					this.passerALaLigneSuivante();
					this.etat = this.default;
					break;
				case this.image:
					const matchImage = /!\[([^\[\]]+)\]\(([^\s)]+)(?:\s"([^"]+)")?\)/g.exec(ligne);
					if(matchImage)
					{
						// console.log(matchImage);
						// v.1
						/*
						const title = matchImage[1];
						let alt = 'Image';
						if(matchImage[3])
						{
							alt = matchImage[3].replace('*', '&ast;');
						}
						this.html += `<figure><img src="./notes/${matchImage[2]}" alt="${alt}" title="${title}"/><figcaption>${matchImage[1]}</figcaption></figure>`;  // sans width et height
						this.passerALaLigneSuivante();
						this.etat = this.default;
						*/
						// v.2
						const title = matchImage[1];
						let alt = 'Image';
						if(matchImage[3])
						{
							alt = matchImage[3].replace('*', '&ast;');
						}
						this.figure = `<figure><img src="./notes/${matchImage[2]}" alt="${alt}" title="${title}"/>`;  // sans width et height
						this.passerALaLigneSuivante();
						this.etat = this.imageLegende;
					}
					else
					{
						this.etat = this.paragraphe;
					}
					break;
				case this.imageLegende:
					if(ligne.length == 0) // ligne vide 
					{
						this.passerALaLigneSuivante();
						break;
					}			
					if(/^!- /.test(ligne))
					{
						let contenuLegende = this.obtenirLigneSansPrefixe(ligne);
						contenuLegende = this.formaterTexte(contenuLegende);
						this.figure += `<figcaption>${contenuLegende}</figcaption>`;
						this.figure += '</figure>';
						this.html += this.figure;
						this.passerALaLigneSuivante();
						this.etat = this.default;
					}
					else
					{
						this.figure += '</figure>';
						this.html += this.figure;
						this.etat = this.default;
					}
					break;
				case this.liste:
					const match = ligne.match(/^(\t*)(-|[0-9]+\.)\s+(.*)$/);
					if(!match)
					{
						while (this.listePile.length > 0) 
						{
							this.html += `</${this.listePile.pop()}></li>`;
						}
						// this.html += '</' + this.listeRacine + '>';
						this.listeRacine = null;
						this.listePile = [];
						this.passerALaLigneSuivante();
						this.etat = this.default;
						break;
					}
					const niveauIndentation = match[1].length;
					const listType = /^[0-9]+\./.test(match[2]) ? 'ol' : 'ul';
					const texte = this.formaterTexte(match[3]);
					
					while(this.listePile.length > niveauIndentation +1)
					{
						this.html += `</${this.listePile.pop()}></li>`;	
					}
					
					if(this.listePile.length == niveauIndentation)
					{
						const nouvelleListe = `<${listType}>`;
						this.html += `${nouvelleListe}`;
						this.listePile.push(listType);
					}
					this.html += `<li>${texte}`;
					this.passerALaLigneSuivante();
					break;
				case this.tableEnTete:
					// Tous les segments entre les pipes servent à l'en-tête	
					this.tableHeader = ligne.match(/[^|]+/g).map(bloc => bloc.trim());
					this.passerALaLigneSuivante();
					this.etat = this.tableStructure;
					break;
				case this.tableStructure: 
					// La ligne correspond-elle à l'en-tête conservée ?
					if(!/^(\s*[^|]*\s*\|)+\s*[^|]*\s*$/.test(ligne))
					{
						this.revenirALaLignePredecente();
						this.etat = this.paragraphe;
						break;
					}
					const structure = ligne.match(/[^|]+/g).map(bloc => bloc.trim());
					if(this.tableHeader.length != structure.length)
					{
						this.revenirALaLignePredecente();
						this.etat = this.paragraphe;
						break;
					}
					// Créer la table et la conserver de façon temporaire
					this.tableTemp = '<table><thead><tr>';
					this.tableHeader.forEach(element => 
						{
							this.tableTemp += '<th>' + this.formaterTexte(element) + '</th>';
						});
					this.tableTemp += '</tr></thead><tbody>'
					this.passerALaLigneSuivante();
					this.etat = this.tableLigne;
					break;
				case this.tableLigne:
					// La ligne correspond-elle à l'en-tête conservée ?
					if(!/^(\s*[^|]*\s*\|)+\s*[^|]*\s*$/.test(ligne))
					{
						this.tableTemp += '</tbody></table>';
						this.html += this.tableTemp;
						this.tableTemp = null;
						this.passerALaLigneSuivante();
						this.etat = this.default;
						break;
					}
					const structureLigne = ligne.match(/[^|]+/g).map(bloc => bloc.trim());
					if(this.tableHeader.length != structureLigne.length)
					{
						this.tableTemp += '</tbody></table>';
						this.html += this.tableTemp;
						this.tableTemp = null;
						this.passerALaLigneSuivante();
						this.etat = this.default;
						break;
					}
					// Enregistrer une nouvelle ligne
					this.tableTemp += '<tr>';
					structureLigne.forEach(el => 
						{							
							this.tableTemp += `<td>${this.formaterTexte(el)}</td>`;
						});
					this.tableTemp += '</tr>';
					// Si c'est la dernière ligne du md, terminer la <table>
					if(this.indexActuel == this.tableauMd.length -1)
					{
						this.tableTemp += '</tbody></table>';
						this.html += this.tableTemp;
						this.tableTemp = null;
					}
					this.passerALaLigneSuivante();
					break;
				case this.citation:			
					if(ligne.length == 0) // ligne vide 
					{
						this.passerALaLigneSuivante();
						break;
					}
					if(ligne.substring(0,2) === '> ')
					{
						this.html += `<p>${this.formaterTexte(this.obtenirLigneSansPrefixe(ligne))}</p>`;
						this.passerALaLigneSuivante();
						break;
					}
					else
					{
						this.html += '</blockquote>';
					}					
					if(ligne.substring(0,3) === '!> ')
					{
						this.html += `<figcaption>${this.formaterTexte(this.obtenirLigneSansPrefixe(ligne))}</figcaption></figure>`;
						this.passerALaLigneSuivante();
						this.etat = this.default;
					}
					else
					{
						this.html += '</figure>';
						this.etat = this.default;
					}
					break;
				default:
					break;
			}
		}
	
		return this.html;
	}
	
	passerALaLigneSuivante = () =>
	{
		this.indexActuel++;
	}
	
	revenirALaLignePredecente = () =>
	{
		this.indexActuel--;
	}
	
	obtenirLigneSansPrefixe = (ligne) =>
	{
		// Exemples : '- ', '3. ', '## '.
		let positionPremierEspace = ligne.indexOf(' ');
		return ligne.substring(positionPremierEspace +1, ligne.length);
	}
		
	formaterTexte = (md) =>
	{
		let html = md;
		
		html = this.convertirEnEntities(md);
		
		// <code>
		html = html.replace(/`(.*?)`/g, '<code>$1</code>');
		
		// Images
		const images = [...html.matchAll(/!\[([^\[\]]+)\]\(([^\s)]+)(?:\s"([^"]+)")?\)|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		for (let i = 0; i < images.length; i++) 
		{
			const element = images[i];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element[0])) continue;
			// C'est une image, alors formater
			const src = element[2];
			let altEtTitle = element[1].replace('*', '&ast;');
			const img = `<img src="./notes/${src}" alt="${altEtTitle}" title="${altEtTitle}">`; // sans width et height
			
			html = html.replace(element[0], img);
		}
		
		// Liens
		// const liens = [...html.matchAll(/\[([^"`]+)\]\((.*?)\)|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		const liens = [...html.matchAll(/(?<!!)\[([^\[\]]+)\]\(([^\s)]+)(?:\s"([^"]+)")?\)|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		for (let i = 0; i < liens.length; i++) 
		{
			const element = liens[i];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element[0])) continue;
			// Ce n'est pas du code, alors formater.
			// La bulle d'aide de rollover (title) est définie entre les parenthèses, après le premier espace. Ex : [texte](http... bulle d'aide)
			// Si pas de bulle, alors ajouter la chaîne "Consulter". Ex : [texte](http...)
			const lienTexte = element[1];
			const lienHref = element[2];
			let lienTitle = 'Consulter la page';
			if(element[3])
			{
				lienTitle = element[3];
				// Pas de mise en forme 
				lienTitle = lienTitle.replace('*', '&ast;');
			}
			const a = `<a href="${lienHref}" title="${lienTitle}">${lienTexte}</a>`; // target="_blank" rel="noopener noreferrer" si besoin
			html = html.replace(element[0], a);
		}
		
		// strong-em et aussi <code>strong-em</code> et aussi lien
		// const strongEmsEtCode = [...html.matchAll(/\*\*\*(\S.*?\S)\*\*\*|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		const strongEmsEtCode = [...html.matchAll(/\*\*\*(.*?)\*\*\*|<code>(?:(?!<\/?code>).)*<\/code>/g)]; // sinon, ***a*** non identifié
		for (let i = 0; i < strongEmsEtCode.length; i++) 
		{
			const element = strongEmsEtCode[i][0];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element)) continue;
			// Ce n'est pas du <code>, alors formater
			html = html.replace(element, `<strong><em>${strongEmsEtCode[i][1]}</em></strong>`);
		}
		
		// strong et aussi <code>strong</code>
		// const strongEtCode = [...html.matchAll(/\*\*(\S.*?\S)\*\*|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		const strongEtCode = [...html.matchAll(/\*\*(.*?)\*\*|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		for (let i = 0; i < strongEtCode.length; i++) 
		{
			const element = strongEtCode[i][0];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element)) continue; 
			// Ce n'est pas du <code>, alors formater
			html = html.replace(element, `<strong>${strongEtCode[i][1]}</strong>`);
		}
		
		// em et aussi <code>em</code>
		// const emEtCode = [...html.matchAll(/\*(\S.*?\S)\*|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		const emEtCode = [...html.matchAll(/\*(.*?)\*|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		for (let i = 0; i < emEtCode.length; i++) 
		{
			const element = emEtCode[i][0];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element)) continue; 
			// Ce n'est pas du <code>, alors formater
			html = html.replace(element, `<em>${emEtCode[i][1]}</em>`);
		}
		
		// -- (pour <cite>, indicateur personnel) et aussi <code>--</code>
		// const citeEtCode = [...html.matchAll(/--(\S.*?\S)--|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		const citeEtCode = [...html.matchAll(/--(.*?)--|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		for (let i = 0; i < citeEtCode.length; i++) 
		{
			const element = citeEtCode[i][0];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element)) continue; 
			// Ce n'est pas du <code>, alors formater
			html = html.replace(element, `<cite>${citeEtCode[i][1]}</cite>`);
		}
				
		return html;
		
		// Obtenir tous les <code>
		// let balisesCode = [...html.matchAll(/`([^`]*)`/g)];
		// <strong><em>
		// let balisesStrongEm = [...html.matchAll(/\*\*\*(.*?)\*\*\*/g)];
		// if(balisesStrongEm.length > 0)
		// {
		// 	for (let i = 0; i < balisesStrongEm.length; i++) 
		// 	{
		// 		const element = balisesStrongEm[i];
		// 		const valeur = element[0];
		// 		const indexDebut = element.index;
		// 		const indexFin = indexDebut + valeur.length;
		// 		// console.log(valeur, 'indexDebut : ' + indexDebut, 'indexFin : ' + indexFin);
		// 		const contenuSeul = element[1];
				
		// 		for (let j = 0; j < balisesCode.length; j++) 
		// 		{
		// 			const baliseCodeValeur = balisesCode[j][0];
		// 			const baliseCodeDebut = balisesCode[j].index;
		// 			const baliseCodeFin = baliseCodeDebut + baliseCodeValeur.length;
		// 			// console.log(baliseCodeValeur, baliseCodeDebut, baliseCodeFin);	
		// 			if(baliseCodeDebut >= indexDebut && baliseCodeFin <= indexFin)
		// 			{
		// 				console.log('>> Code dans du em. Gérer le code.');
						
		// 				let codeHtml = balisesCode[j][1];
		// 				// codeHtml = this.convertirEnEntities(codeHtml);
		// 				codeHtml = `<code>${codeHtml}</code>`;
						
		// 				console.log('>> ' + codeHtml);
						
		// 			}
		// 		}
		// 		console.log("---");
		// 	}
		// }	
		
		// return html;
		
		// v.1
		
		// <a>
		// html = html.replace(/\[([^"`]+)\]\((.*?)\)/g, '<a href="$2" title="$1" target="_blank" rel="noopener noreferrer">$1</a>');
		// // ne doit pas être entre backticks - non pris en charge
		// // html = html.replace(/(?<!`[^`]*)\[([^"`]+)\]\((.*?)\)(?![^`]*`)/g, '<a href="$2" title="$1" target="_blank" rel="noopener noreferrer">$1</a>');
		
		// // <strong><em>
		// html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
		// // ne doit pas être entre backticks - non pris en charge
		// // html = html.replace(/(?<!`[^`]*)\*\*\*(.*?)\*\*\*(?![^`]*`)/g, '<strong><em>$1</em></strong>');
		
		// // <strong>
		// html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		// // ne doit pas être entre backticks - non pris en charge
		// // html = html.replace(/(?<!`[^`]*)\*\*(.*?)\*\*(?![^`]*`)/g, '<strong>$1</strong>');
		
		// // <em>
		// html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
		// // ne doit pas être entre backticks - non pris en charge
		// // html = html.replace(/(?<!`[^`]*)\*(.*?)\*(?![^`]*`)/g, '<em>$1</em>');
		
		// // <code> 
		// // html = html.replace(/`(.*?)`/g, '<code>$1</code>');
		// // v.2
		// let codes = [...html.matchAll(/`([^`]*)`/g)];
		// if(codes.length > 0)
		// {
		// 	for (let i = 0; i < codes.length; i++) 
		// 	{
		// 		let e = codes[i][1]; // contenu sans les `
		// 		e = this.convertirEnEntities(e);
		// 		html = html.replace(codes[i][0], `<code>${e}</code>`);
		// 	}
		// }
		
		// return html;
	}
				
	formaterTitre = (md) =>
	{
		let html = md;
		
		html = this.convertirEnEntities(md);
		
		// <code>
		html = html.replace(/`(.*?)`/g, '<code>$1</code>');
		
		// em et aussi <code>em</code>
		const emEtCode = [...html.matchAll(/\*(\S.*?\S)\*|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		for (let i = 0; i < emEtCode.length; i++) 
		{
			const element = emEtCode[i][0];
			// Est-ce un <code> ? Passer
			if(/^<code>.*<\/code>$/g.test(element)) continue; 
			// Ce n'est pas du <code>, alors formater
			html = html.replace(element, `<em>${emEtCode[i][1]}</em>`);
		}
				
		return html;
		
		// // <em>
		// html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
		// // ne doit pas être entre backticks - non pris en charge 
		// // html = html.replace(/(?<!`[^`]*)\*(.*?)\*(?![^`]*`)/g, '<em>$1</em>');
		
		// // <code> 
		// // html = html.replace(/`(.*?)`/g, '<code>$1</code>');
		// // v.2
		// let codes = [...html.matchAll(/`([^`]*)`/g)];
		// if(codes.length > 0)
		// {
		// 	for (let i = 0; i < codes.length; i++) 
		// 	{
		// 		let e = codes[i][1]; // contenu sans les `
		// 		e = this.convertirEnEntities(e);
		// 		html = html.replace(codes[i][0], `<code>${e}</code>`);
		// 	}
		// }
		
		// return html;
	}
	
	convertirEnEntities = (texte) =>
	{
		let sortie = texte;
		sortie = sortie.replaceAll('<', '&lt;');
		sortie = sortie.replaceAll('>', '&gt;');
		return sortie;
	}
}