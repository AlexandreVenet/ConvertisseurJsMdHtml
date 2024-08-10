"use strict";

let chargerPage = async (chemin) =>
{	
	try 
	{
		const p = await fetch(chemin);
		if(!p.ok)
		{
			throw new Error(p.status + ' ' + p.statusText);
		}
		else
		{
			const texte = await p.text();
			const html = new Convertisseur().analyser(texte);
			construirePage(html);
		}
	} 
	catch (error) 
	{
		console.log(error.message);
	}
}

let construirePage = (html) =>
{
	const main = document.querySelector('main');
	
	let htmlDoc = new DOMParser().parseFromString(html, 'text/html');
	let bodyNodes = htmlDoc.body.childNodes;
	for (const noeud of bodyNodes) 
	{
		// console.log(noeud);
		main.appendChild(noeud.cloneNode(true)); 
		// https://stackoverflow.com/questions/55354063/appendchild-only-works-on-last-element
	}
}

window.onload = () =>
{
	chargerPage('./notes/accueil.md');
}