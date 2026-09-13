"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

/*
 * Renderiza la respuesta del agente como Markdown.
 *
 * EPA contesta en Markdown (`###`, `**negrita**`, listas, `código`).
 * Al insertarlo como texto plano en JSX se rompían dos cosas a la vez:
 * React escapaba los símbolos, así que se veían crudos, y el navegador
 * colapsaba los saltos de línea, así que toda la respuesta caía en un
 * solo párrafo.
 *
 * remark-gfm    → tablas, tachado, listas de tareas, autolinks.
 * remark-breaks → un `\n` suelto se vuelve <br>. Los modelos separan
 *                 renglones con un salto simple, no con línea en blanco,
 *                 así que sin esto las listas se siguen pegando.
 *
 * No hace falta sanitizar: react-markdown ignora el HTML crudo salvo que
 * se le agregue rehype-raw, y ya filtra protocolos peligrosos en los
 * enlaces. Si algún día se habilita rehype-raw, hay que sumar
 * rehype-sanitize aquí.
 */
export default function MarkdownMessage({
  text,
}: {
  text: string;
}) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
        }}
      >
        {normalize(text)}
      </ReactMarkdown>
    </div>
  );
}

/*
 * Normaliza el texto antes de parsearlo.
 *
 * El caso que más muerde con n8n: la respuesta viaja con doble
 * codificación JSON y los saltos llegan como la secuencia literal
 * `\` + `n` en vez de un salto real. Sin esto ningún parser formatea
 * nada.
 *
 * Solo des-escapamos cuando no hay saltos reales, para no romper un
 * bloque de código que legítimamente contenga `\n`.
 */
function normalize(raw: string) {
  if (!raw) {
    return "";
  }

  let text = raw.replace(/\r\n/g, "\n");

  if (!text.includes("\n") && /\\n/.test(text)) {
    text = text
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  return text.trim();
}
