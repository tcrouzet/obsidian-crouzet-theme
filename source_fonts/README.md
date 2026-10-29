# Font sources

## iA Writer

Original files from [iA-Fonts](https://github.com/iaolo/iA-Fonts/tree/c6588670c71e9ac628acc27b72cde4bf12726b7f), revision `c6588670c71e9ac628acc27b72cde4bf12726b7f`. The snippets embed the upright and italic TTFs from each family's `Variable/` directory, with the original 400–700 weight range. This includes the theme's 500 body weight. The static WOFF2 sources from `Webfonts/` are also retained. Files are preserved without conversion or subsetting.

Copyright © 2018 Information Architects Inc., based on IBM Plex, copyright © 2017 IBM Corp. Each family's original license is included alongside the font files and copied into its generated snippet. The fonts remain under the SIL Open Font License 1.1; the theme's MIT license does not replace it.

The [upstream README](https://github.com/iaolo/iA-Fonts#readme) also states that iA does not approve bundling these fonts with other text editors. These optional snippets are separate from the theme stylesheet and do not imply endorsement by iA.

## JetBrains Mono

Original WOFF2 files from [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono/tree/19371302b95d218af43299bce79ddbddd0bc364d/fonts/webfonts), revision `19371302b95d218af43299bce79ddbddd0bc364d`. Includes Regular, Italic, Medium, MediumItalic, Bold and BoldItalic, preserved without conversion or subsetting. The family is also available on [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono).

Copyright 2020 The JetBrains Mono Project Authors. The original `OFL.txt` is preserved as [JetBrains-Mono-LICENSE.md](JetBrains-Mono-LICENSE.md) and copied into the generated snippet. The font remains under the SIL Open Font License 1.1.

## Rubik

Original variable TTF files from [Google Fonts](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/rubik), revision `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`. `Rubik[wght].ttf` and `Rubik-Italic[wght].ttf` are stored as `Rubik.ttf` and `Rubik-Italic.ttf`, with their bytes unchanged. Both cover weights 300–900, including the theme's 500 body weight. The family is also available on [Google Fonts](https://fonts.google.com/specimen/Rubik).

Copyright 2015 The Rubik Project Authors. The original `OFL.txt` is preserved as [Rubik-LICENSE.md](Rubik-LICENSE.md) and copied into the generated snippet. The font remains under the SIL Open Font License 1.1.

## Amazon Bookerly

Original `Bookerly-Regular.ttf`, `Bookerly-Italic.ttf`, `Bookerly-Bold.ttf` and `Bookerly-BoldItalic.ttf` from Amazon's [complete font set](https://developer.amazon.com/en-US/alexa/branding/echo-guidelines/identity-guidelines/typography), archive [Amazon_Typefaces_Complete_Font_Set_Mar2020.zip](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/branding/Amazon_Typefaces_Complete_Font_Set_Mar2020.zip). These are the eInk faces, supplied at weights 400 and 700; there is no Medium 500 face in this set. Filenames, font bytes and embedded ownership notices are preserved without conversion or subsetting.

Copyright 2014 Dalton Maag Ltd. The archive's `Amazon Ember Licensing Guidelines.pdf` covers Bookerly and is transcribed in [Bookerly-LICENSE.md](Bookerly-LICENSE.md), which is included in the generated snippet. Bookerly remains proprietary. The supplied guidelines permit including the designs in your work without license payments or royalties, require retaining the proper font names, and require the Amazon prefix when naming the font in a menu or text option dialog. The CSS uses the family alias `Amazon Bookerly`; the font files themselves are unchanged. The theme's MIT license does not replace Amazon's terms.

## Apple system fonts

Menlo comes from `/System/Library/Fonts/Menlo.ttc`. Its four faces are Regular (collection index 0), Bold (1), Italic (2) and BoldItalic (3).

SF Mono comes from `/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts/`: `SF-Mono-Regular.otf`, `SF-Mono-RegularItalic.otf`, `SF-Mono-Medium.otf`, `SF-Mono-MediumItalic.otf`, `SF-Mono-Bold.otf` and `SF-Mono-BoldItalic.otf`.

The original TTC and OTF files are preserved here. Compressed WOFF copies were prepared with FontTools 4.50.0, without subsetting; font metadata and copyright notices are retained. For Menlo, use `fonttools ttLib Menlo.ttc -y 0 --flavor woff -o Menlo-Regular.woff`, choosing the matching index for each face. For SF Mono, use `fonttools ttLib SF-Mono-Regular.otf --flavor woff -o SF-Mono-Regular.woff`, with the matching input for each style; RegularItalic maps to Italic in the output name.

These are proprietary Apple fonts. [Menlo-LICENSE.md](Menlo-LICENSE.md) records its provenance and applicable macOS terms; [SF-Mono-LICENSE.md](SF-Mono-LICENSE.md) contains the license extracted from the font's metadata. These terms restrict embedding and redistribution. Neither the theme's MIT license nor the OFL licenses for the other fonts grant additional rights to these files.

## Regenerate snippets

From the repository root, run `npm run fonts` to regenerate the standalone snippets in `snippets/fonts/` offline. It embeds the TTF, WOFF and WOFF2 files directly; FontTools is only needed to prepare new WOFF copies from Apple originals.
