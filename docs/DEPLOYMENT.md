# Demo deployment

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml` for a free static demo.

1. Create or use a GitHub repository.
2. Push the project to the `main` branch.
3. In `Settings > Pages`, select `GitHub Actions`.
4. Run or wait for `Deploy demo` in the `Actions` tab.
5. Share the URL from the completed `github-pages` environment.

The PWA uses relative paths, so it works from a repository subpath. The deployed site includes the application shell, runtime `js` modules, images, and vocabulary data, while PDFs and development files stay out of the demo artifact.

## Local preview

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. A service worker requires HTTP or HTTPS; opening `index.html` directly from the file system will not test offline behavior correctly.
