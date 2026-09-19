# Edgar Cruz — portfolio

Portfolio site for Edgar Cruz, a freelance video editor, web developer and social media
manager based in the Philippines.

**Live:** https://edgarcruzstudio.github.io/

## Structure

```
docs/                        the website (GitHub Pages serves this folder)
docs/index.html              the page
docs/assets/css/styles.css   styling, design tokens at the top
docs/assets/js/main.js       filters, video reels, rails, chart, contact form
docs/assets/img/             photography, project screenshots, video posters
docs/videos/                 short-form and long-form clips, played on hover
```

Static HTML, CSS and JavaScript. No build step, no framework, no dependencies.

## Run it locally

```bash
cd docs
python -m http.server 8000
```

Then open http://localhost:8000.

## Contact form

Messages are delivered by [Web3Forms](https://web3forms.com). The access key in the page
`<head>` is public by design: it can only send messages to the site owner's inbox.

## Credits

- Type: Archivo, Instrument Sans and DM Mono, via Google Fonts
- Tool icons: [Simple Icons](https://simpleicons.org) (CC0)
- Paper texture: Texture Labs

Site design, code, photography and copy © Edgar Cruz. Client names, logos and trademarks
belong to their respective owners.
