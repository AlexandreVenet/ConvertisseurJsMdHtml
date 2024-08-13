# ConvertisseurJsMdHtml

Essai de convertisseur de texte Markdown en HTML. 

Approche de sécurité : le code HTML inséré en Markdown ne doit pas être interprété.

Projet déployé en GitHub Pages pour [voir le fonctionnement](https://alexandrevenet.github.io/ConvertisseurJsMdHtml).

## Usage

```JS
const html = new Convertisseur().analyser(texte, './notes/');
// texte : le contenu Markdown
// './notes/' : début de chemin vers les ressources images
```

## Liens

Définir l'attribut `target="blank"` avec le mot-clé personnalisé `_blank` :

```md
[innerText](chemin "title" _blank)
[innerText](chemin _blank)
```

## Références

Pour ajouter une référence `<cite>`, j'utilise l'encadrement personnalisé `--` :

```md
--Iliade-- d'Homère
--[Iliade](https://fr.wikipedia.org/wiki/Iliade)-- d'Homère
```

## Citations

Les blocs de citations deviennent des `<figure><blockquote>`.

```md
> Un paragraphe de citation.
> Un autre paragraphe de citation.
```

La source d'une citation fait l'objet du préfixe personnalisé `!>`, ce qui produira une balise `<figcaption>` à la suite de `<blockquote>` à l'intérieur de `<figure>` :

```md
!> Aldous Huxley
```

```
!> Aldous Huxley, --[Brave New World](https://www.huxley.net/bnw)--
```

## Images

Les images deviennent des `<figure><img>`.

```md
![title](media/32x32.png "alt")
```

Le lien vers l'image est relatif au fichier Markdown. Lors de la conversion, les séquences `../` éventuelles sont supprimées puis le début de chemin, début passé en argument de `analyser()` avec ou sans *slash* de fin, est ajouté en début de lien. Exemple : `../media/image.png` devient `./notes/media/image.png` si l'on passe `./notes/` (ou `./notes`) en argument d'`analyser()`.

La légende d'une image fait  l'objet du préfixe personnalisé `!-`, ce qui produira une balise `<figcaption>` à la suite de `<img>` à l'intérieur de `<figure>` :

```md
!- Paragraphe de légende...
```

## Listes

Les listes sont formées avec `-` pour produire `<ul>` ou `1.` pour produire `<ol>`. Les listes imbriquables se déclarent avec un caractère de **tabulation** avant le préfixe de ligne (et non pas des espaces).

## Tableaux

Les tableaux sont pris en charge. La ligne de structure permet de vérifier que l'en-tête est valide, et si c'est le cas de commencer à générer la `<table>` ; ensuite, toute ligne ne correspondant pas à la structure termine la construction.
