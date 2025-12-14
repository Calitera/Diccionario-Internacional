# Academia Caliterana de lo Internacional

**Website:** [lingua.calitera.org](https://lingua.calitera.org)

This repository contains the official website for the **Academia Caliterana de lo Internacional**, an organization dedicated to systematizing, modernizing, and promoting the **Internacional** language (also known as **Lo Internacional**).

## About Lo Internacional

Lo Internacional is a Romance-based constructed auxiliary language created by **João Evangelista Campos Lima** in 1948 and documented in his work *Gramática Internacional*. The language draws from Latin roots and Romance language characteristics, designed to serve as a natural and accessible international medium of communication.

## Mission / Nostra Mission

The Academia's mission is threefold:

- **Systematization (Sistematizacion)**: Using Campos Lima's system as the foundation, expanding vocabulary while remaining loyal to his original criteria
- **Modernization (Modernizacion)**: Adapting the language to contemporary science and technology while maintaining its etymological roots and Latin character
- **Promotion (Promocion)**: Propagating the language through education and literary production to demonstrate its fluency and viability as a national and global medium

## Features

This website provides comprehensive resources for learning and using Lo Internacional:

### 📚 Dictionary (Diccionário)
- **Searchable lexicon** with over 1,000 entries
- Search by headword, meaning, tags, or part of speech
- Browse alphabetically (A-Z)
- Filter by part of speech (noun, verb, adjective, etc.)
- Cross-reference linking between related words
- Detailed definitions with:
  - IPA pronunciation
  - Multiple glosses and usage notes
  - Tags (e.g., "basic", "swadesh")

### 🔤 Letters & Pronunciation (Líteras & Pronunciacion)
- Complete orthography guide based on *Gramática Internacional* tradition
- IPA (International Phonetic Alphabet) transcriptions
- Coverage of:
  - Single letters
  - Digraphs (CH, GU, GÜ, QU, QÜ, RR, SC, SS)
  - Contextual pronunciation rules
  - Vowel and consonant systems

### 🏛️ Academy Information
- Mission statement in English and Lo Internacional
- Historical background and cultural context
- Information about the language's creator

## Project Structure

```
├── index.html          # Homepage with academy mission
├── dictionary.html     # Interactive dictionary interface
├── phonology.html      # Letters and pronunciation guide
├── app.js             # Dictionary application logic
├── phonology.js       # Phonology guide functionality
├── styles.css         # Styling for all pages
├── data/
│   ├── lexicon.json   # Dictionary entries database
│   └── phonology.json # Phonology rules database
├── assets/
│   └── logo.png       # Academia logo
└── CNAME              # Custom domain configuration
```

## Data Format

### Lexicon (`data/lexicon.json`)

The dictionary data follows this structure:

```json
{
  "meta": {
    "lang": "Internacional",
    "glossLang": "en",
    "source": "Gramática Internacional (Campos Lima, 1948)",
    "version": "1.2",
    "type": "Comprehensive Verified Dictionary"
  },
  "entries": [
    {
      "id": "unique-id",
      "headword": "word",
      "pos": "part-of-speech",
      "pron": "/IPA/",
      "defs": [
        {
          "gloss": "English meaning",
          "notes": "usage notes"
        }
      ],
      "tags": ["basic", "swadesh"],
      "src_id": "[citation reference]"
    }
  ]
}
```

**Parts of Speech**: `n` (noun), `v` (verb), `adj` (adjective), `adv` (adverb), `pron` (pronoun), `prep` (preposition), `conj` (conjunction), `part` (particle), `num` (number)

### Phonology (`data/phonology.json`)

The phonology data contains pronunciation rules:

```json
[
  {
    "grapheme": "Letter or digraph",
    "context": "When it appears (context)",
    "ipa": "/phonetic representation/"
  }
]
```

## How to Use

### Viewing Locally

This is a static website that requires no build process. Simply:

1. Clone the repository:
   ```bash
   git clone https://github.com/Calitera/lingua.git
   cd lingua
   ```

2. Open in a web browser:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Node.js
   npx serve
   ```

3. Navigate to `http://localhost:8000` in your browser

### Deployment

The site is designed to be deployed as a static website. It's currently hosted via GitHub Pages at [lingua.calitera.org](https://lingua.calitera.org).

To deploy to GitHub Pages:
1. Push changes to the repository
2. GitHub Pages will automatically serve from the default branch
3. The `CNAME` file configures the custom domain

## Contributing

Contributions to expand the dictionary, improve the website, or correct information are welcome. When contributing:

- Maintain consistency with Campos Lima's original *Gramática Internacional* (1948)
- Follow the existing data format for lexicon and phonology entries
- Ensure etymological accuracy and Latin character of the language
- Test changes locally before submitting

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript (no frameworks)
- **Data**: JSON files for easy editing and version control
- **Hosting**: GitHub Pages with custom domain
- **Features**: Client-side search, filtering, and cross-referencing

## Credits

- **Language Creator**: João Evangelista Campos Lima
- **Source Material**: *Gramática Internacional* (1948)
- **Website Development**: Academia Caliterana de lo Internacional
- **Maintained by**: Calitera community

## License

This project is dedicated to the preservation and promotion of the Internacional language. The dictionary and linguistic data are based on historical public domain sources. Please respect the cultural and linguistic heritage when using this material.

---

*La nostra mission è sistematizar, modernizar e promover la língua Internacional.*
