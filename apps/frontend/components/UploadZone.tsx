import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onResumeText: (text: string, filename?: string, file?: File) => void;
  onJdText: (text: string) => void;
  resumeText: string;
  jdText: string;
}

export default function UploadZone({ onResumeText, onJdText, resumeText, jdText }: Props) {
  const [filename, setFilename] = useState<string>("");

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setFilename(file.name);
      if (file.type === "text/plain") {
        const text = await file.text();
        onResumeText(text, file.name);
      } else {
        onResumeText("__PDF__:" + file.name, file.name, file);
      }
    },
    [onResumeText]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Resume upload */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-gray-300">Resume (PDF or text)</label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-indigo-400 bg-indigo-950/30" : "border-gray-600 hover:border-indigo-500"}`}
        >
          <input {...getInputProps()} />
          {filename ? (
            <p className="text-indigo-300 font-medium">📄 {filename}</p>
          ) : (
            <p className="text-gray-400 text-sm">
              {isDragActive ? "Drop it here…" : "Drag & drop a PDF/TXT, or click to browse"}
            </p>
          )}
        </div>
        <textarea
          className="bg-gray-800 rounded-xl p-3 text-sm resize-none h-40 border border-gray-700 focus:outline-none focus:border-indigo-500"
          placeholder="…or paste resume text here"
          value={resumeText.startsWith("__PDF__") ? "" : resumeText}
          onChange={(e) => { setFilename(""); onResumeText(e.target.value); }}
        />
      </div>

      {/* JD input */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-gray-300">Job Description</label>
        <textarea
          className="bg-gray-800 rounded-xl p-3 text-sm resize-none flex-1 h-[13.5rem] border border-gray-700 focus:outline-none focus:border-indigo-500"
          placeholder="Paste the job description here…"
          value={jdText}
          onChange={(e) => onJdText(e.target.value)}
        />
      </div>
    </div>
  );
}
