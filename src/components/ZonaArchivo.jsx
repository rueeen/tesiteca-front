import { useRef, useState } from "react";
export default function ZonaArchivo({ archivo, onChange, excel = false }) {
  const ref = useRef();
  const [error, setError] = useState("");
  function elegir(file) {
    if (!file) return;
    const valido = excel
      ? /\.(xlsx|csv)$/i.test(file.name)
      : file.type === "application/pdf";
    if (!valido) {
      setError(
        excel
          ? "Selecciona un archivo .xlsx o .csv."
          : "Selecciona un documento PDF.",
      );
      return;
    }
    if (!excel && file.size > 30 * 1024 * 1024) {
      setError("El PDF no debe superar 30 MB.");
      return;
    }
    setError("");
    onChange(file);
  }
  return (
    <>
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          elegir(e.dataTransfer.files[0]);
        }}
      >
        <span className="fileicon">↑</span>
        <b>{archivo ? archivo.name : "Arrastra tu archivo aquí"}</b>
        <span>
          {archivo
            ? `${(archivo.size / 1024 / 1024).toFixed(2)} MB`
            : excel
              ? "Excel (.xlsx) o CSV"
              : "Documento PDF · máximo 30 MB"}
        </span>
        <button type="button" onClick={() => ref.current.click()}>
          Seleccionar archivo
        </button>
        <input
          ref={ref}
          type="file"
          hidden
          accept={excel ? ".xlsx,.csv" : "application/pdf"}
          onChange={(e) => elegir(e.target.files[0])}
        />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
