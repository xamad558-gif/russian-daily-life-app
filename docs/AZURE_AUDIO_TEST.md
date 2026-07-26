# Azure Arabic Audio Test

The VS Code extension **Azure AI Speech Toolkit** is installed and can configure or create the Azure Speech resource. The project uses the small generator in `scripts/generate-azure-arabic-sample.mjs` to create five local MP3 files using that resource.

## Sample words

- `дом` — `بيت`
- `кухня` — `مطبخ`
- `холодильник` — `ثلاجة`
- `кровать` — `سرير`
- `пылесос` — `مكنسة كهربائية`

The sample uses Azure voice `ar-SA-ZariyahNeural` and the existing `audioWordAr` paths in `data/words.json`.

## Run from VS Code PowerShell

1. Open the Azure AI Speech Toolkit from the VS Code Activity Bar.
2. Sign in to Azure and choose **Configure Azure Speech Resources**, or create a Speech resource.
3. Set the resource key and region for the current terminal. Do not commit the key:

```powershell
$env:AZURE_SPEECH_KEY = "paste-your-key-here"
$env:AZURE_SPEECH_REGION = "your-resource-region"
```

4. Preview the five requests without contacting Azure:

```powershell
node scripts/generate-azure-arabic-sample.mjs --dry-run
```

5. Generate the five local MP3 files:

```powershell
node scripts/generate-azure-arabic-sample.mjs
```

After generation, use the Arabic speaker buttons in the app to compare the new files with the browser fallback. The generator only writes the five declared word paths; it does not modify the vocabulary data or generate the sentence files yet.
