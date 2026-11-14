# CareTrack prototype test materials

The five HTML forms are designed for one-sided A4 printing. Open an HTML file
in a browser and choose Print; disable browser headers and footers if enabled.
The metrics sheet uses A4 landscape. `print.css` is shared by the printable
documents.

These are usability-test materials for demo data only. Do not write real
patient details on forms or export files. The exports include tracking codes so feedback and stage events can be
associated; protect the CSVs and delete them after analysis.

Export analysis data from the repository root with the Rails environment
configured:

```sh
cd api
bin/rails runner ../docs/prototype-test/export-analysis-data.rb
```

By default, the script writes `docs/prototype-test/exports/stage_events.csv`
and `feedback_responses.csv`. To choose another output directory, pass an
absolute or relative path after the script name:

```sh
bin/rails runner ../docs/prototype-test/export-analysis-data.rb /path/to/private/exports
```
