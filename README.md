# ConvertisseurJsMdHtml

Essai de convertisseur de certaines caractéristiques Markdown en HTML. 

Approche de sécurité : le code HTML inséré en Markdown ne doit pas être interprété.

Projet déployé en GitHub Pages pour voir le fonctionnement.

## Liens

Définir l'attribut `target="blank"` avec le mot-clé personnalisé `_blank` :

```md
[innerText](chemin "title" _blank)
[innerText](chemin _blank)
```

## Citations

Les blocs de citations deviennent des `<figure><blockquote>`.

```md
> Un paragraphe de citation.
> Un autre paragraphe de citation.
```

## Images

Les images deviennent des `<figure><img>`.

```md
![title](media/32x32.png "alt")
```

## Références

Pour ajouter une référence `<cite>`, j'utilise l'encadrement personnalisé `--` :

```md
--Iliade-- d'Homère
--[Iliade](https://fr.wikipedia.org/wiki/Iliade)-- d'Homère
```

## Légendes et sources

La légende d'une image et la source d'une citation font l'objet d'un préfixe personnalisé `!>`, ce qui produira une balise `<figcaption>` à la suite de `<blockquote>` ou `<im>` à l'intérieur de `<figure>` :

```md
!> Aldous Huxley
!> Aldous Huxley, --[Brave New World](https://www.huxley.net/bnw)--
```

## Listes

Les listes sont imbriquables.

## Tableaux

Les tableaux sont pris en charge. La ligne de structure permet de vérifier que l'en-tête est valide, et si c'est le cas de commencer à générer la `<table>` ; ensuite, toute ligne ne correspondant pas à la structure termine la construction.
