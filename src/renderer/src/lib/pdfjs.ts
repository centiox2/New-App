import * as pdfjsLib from 'pdfjs-dist'
// Vite bundles the worker file and gives us a URL we can hand to pdf.js —
// avoids pdf.js's default of fetching the worker from a CDN at runtime.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }
