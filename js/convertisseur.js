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
	debutCheminImages;
	
	// listes
	listeRacine; 
	listePile = []; // Pile pour gérer les listes imbriquées, index 0 est le niveau racine
	
	// Les tables
	tableHeader;
	tableTemp;
	
	analyser = (md, debutCheminImages) =>
	{
		this.debutCheminImages = debutCheminImages;
		if(debutCheminImages.slice(-1) !== '/')
		{
			this.debutCheminImages += '/';
		}
		
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
						const title = matchImage[1];
						let alt = 'Image';
						if(matchImage[3])
						{
							alt = matchImage[3].replace('*', '&ast;');
						}
						const srcSansRelatif = /^(?:\.\.\/)*(.*)/g.exec(matchImage[2]);
						this.figure = `<figure><img src="${this.debutCheminImages}${srcSansRelatif[1]}" alt="${alt}" title="${title}"/>`;  // sans width et height
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
		
		// L'analyse est terminée mais on est resté sur une image ?
		if(this.etat === this.image || this.etat === this.imageLegende)
		{
			this.figure += '</figure>';
			this.html += this.figure;
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
			let altEtTitle = element[1].replace('*', '&ast;');
			const srcSansRelatif = /^(?:\.\.\/)*(.*)/g.exec(element[2]);
			const img = `<img src="${this.debutCheminImages}${srcSansRelatif[1]}" alt="${altEtTitle}" title="${altEtTitle}"/>`;  // sans width et height
			
			html = html.replace(element[0], img);
		}
		
		// Liens
		// const liens = [...html.matchAll(/\[([^"`]+)\]\((.*?)\)|<code>(?:(?!<\/?code>).)*<\/code>/g)];
		const liens = [...html.matchAll(/(?<!!)\[([^\[\]]+)\]\(([^\s)]+)(?:\s"([^"]+)")?(?:\s(_blank))?\)|<code>(?:(?!<\/?code>).)*<\/code>/g)];
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
			const lienTarget = element[4] ? `target="${element[4]}"` : '';
			const a = `<a href="${lienHref}" title="${lienTitle}" ${lienTarget}>${lienTexte}</a>`; // rel="noopener noreferrer" si besoin
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
	}
	
	convertirEnEntities = (texte) =>
	{
		let sortie = texte;
		sortie = sortie.replaceAll('<', '&lt;');
		sortie = sortie.replaceAll('>', '&gt;');
		return sortie;
	}
}
