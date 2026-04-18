import express from "express";
import { Client } from "@notionhq/client";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large markdown files
  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.post("/api/notion", async (req, res) => {
    try {
      let { apiKey, pageId, title, markdown, originalMarkdown, translatedMarkdown } = req.body;
      
      // Fallback if old frontend didn't send original/translated
      if (!originalMarkdown && !translatedMarkdown && markdown) {
        translatedMarkdown = markdown;
        originalMarkdown = "Oryginalny tekst nie został odzyskany.";
      }

      if (!apiKey || !pageId || !translatedMarkdown) {
        return res.status(400).json({ error: "Brak wymaganych danych (Klucz API lub ID Strony)" });
      }

      // Extract page ID if user pasted a full URL
      const match = pageId.match(/[a-f0-9]{32}/i);
      if (match) {
        pageId = match[0];
      }

      const notion = new Client({ auth: apiKey });

      // 1. Create a new page under the specified parent page
      const newPage = await notion.pages.create({
        parent: { page_id: pageId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title || "Przetłumaczony Dokument",
                },
              },
            ],
          },
        },
      });

      // Helper function to parse markdown into Notion blocks
      const parseMarkdownToBlocks = (md: string) => {
        if (!md) return [];
        const paragraphs = md.split('\n\n').filter((p: string) => p.trim() !== '');
        const blocks: any[] = [];

        for (const p of paragraphs) {
          let type = 'paragraph';
          let content = p;

          if (p.startsWith('# ')) { type = 'heading_1'; content = p.replace(/^#\s/, ''); }
          else if (p.startsWith('## ')) { type = 'heading_2'; content = p.replace(/^##\s/, ''); }
          else if (p.startsWith('### ')) { type = 'heading_3'; content = p.replace(/^###\s/, ''); }
          else if (p.startsWith('#### ')) { type = 'heading_3'; content = p.replace(/^####\s/, ''); } // Notion doesn't have H4, map to H3
          else if (p.startsWith('- ') || p.startsWith('* ')) { type = 'bulleted_list_item'; content = p.replace(/^[-*]\s/, ''); }

          // Basic inline formatting: check if whole line is **bold**
          let isBold = false;
          if (content.startsWith('**') && content.endsWith('**')) {
            isBold = true;
            content = content.replace(/^\*\*(.*?)\*\*$/, '$1');
          }

          const chunks = content.match(/.{1,2000}/g) || [];
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const currentType = i === 0 ? type : 'paragraph';
            blocks.push({
              object: 'block',
              type: currentType,
              [currentType]: {
                rich_text: [{ 
                  text: { content: chunk },
                  annotations: { bold: isBold }
                }]
              }
            });
          }
        }
        return blocks;
      };

      const originalBlocks = parseMarkdownToBlocks(originalMarkdown);
      const translatedBlocks = parseMarkdownToBlocks(translatedMarkdown);

      // 2. Create the two columns layout
      const columnListResponse = await notion.blocks.children.append({
        block_id: newPage.id,
        children: [
          {
            object: 'block',
            type: 'column_list',
            column_list: {
              children: [
                {
                  object: 'block',
                  type: 'column',
                  column: {
                    children: [{ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: "Oryginał (EN)" } }] } }]
                  }
                },
                {
                  object: 'block',
                  type: 'column',
                  column: {
                    children: [{ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: "Tłumaczenie (PL)" } }] } }]
                  }
                }
              ]
            }
          }
        ]
      });

      const columnListId = columnListResponse.results[0].id;

      // 3. Get the IDs of the individual columns
      const columnsResponse = await notion.blocks.children.list({ block_id: columnListId });
      const leftColumnId = columnsResponse.results[0].id;
      const rightColumnId = columnsResponse.results[1].id;

      // 4. Append blocks to columns in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < originalBlocks.length; i += chunkSize) {
        await notion.blocks.children.append({
          block_id: leftColumnId,
          children: originalBlocks.slice(i, i + chunkSize),
        });
      }
      for (let i = 0; i < translatedBlocks.length; i += chunkSize) {
        await notion.blocks.children.append({
          block_id: rightColumnId,
          children: translatedBlocks.slice(i, i + chunkSize),
        });
      }

      res.json({ success: true, url: (newPage as any).url });
    } catch (error: any) {
      console.error("Notion API Error:", error);
      
      let errorMessage = "Błąd podczas eksportu do Notion";
      
      if (error.status === 401) {
        errorMessage = "Nieprawidłowy klucz API Notion. Upewnij się, że skopiowałeś poprawny 'Internal Integration Secret'.";
      } else if (error.status === 404) {
        errorMessage = "Nie znaleziono strony Notion. Upewnij się, że ID strony jest poprawne i że dodałeś integrację do tej strony (Connections).";
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(error.status || 500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(__dirname, 'dist');
    if (__dirname.endsWith('dist')) {
      distPath = __dirname;
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
