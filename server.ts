import express from "express";
import { createServer as createViteServer } from "vite";
import { Client } from "@notionhq/client";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for large markdown files
  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.post("/api/notion", async (req, res) => {
    try {
      let { apiKey, pageId, title, markdown } = req.body;
      if (!apiKey || !pageId || !markdown) {
        return res.status(400).json({ error: "Brak wymaganych danych (Klucz API lub ID Strony)" });
      }

      // Extract page ID if user pasted a full URL
      // Notion page IDs are 32 character hex strings at the end of the URL
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

      // 2. Parse markdown into simple Notion blocks
      const paragraphs = markdown.split('\n\n').filter((p: string) => p.trim() !== '');
      const blocks: any[] = [];

      for (const p of paragraphs) {
        let type = 'paragraph';
        let content = p;

        if (p.startsWith('# ')) { type = 'heading_1'; content = p.replace(/^#\s/, ''); }
        else if (p.startsWith('## ')) { type = 'heading_2'; content = p.replace(/^##\s/, ''); }
        else if (p.startsWith('### ')) { type = 'heading_3'; content = p.replace(/^###\s/, ''); }
        else if (p.startsWith('- ') || p.startsWith('* ')) { type = 'bulleted_list_item'; content = p.replace(/^[-*]\s/, ''); }

        // Notion limits text content to 2000 chars per block
        const chunks = content.match(/.{1,2000}/g) || [];
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          // Only the first chunk gets the heading/list type, the rest are paragraphs to avoid breaking Notion rules
          const currentType = i === 0 ? type : 'paragraph';
          
          blocks.push({
            object: 'block',
            type: currentType,
            [currentType]: {
              rich_text: [{ text: { content: chunk } }]
            }
          });
        }
      }

      // 3. Append blocks in chunks of 100 (Notion API limit)
      const chunkSize = 100;
      for (let i = 0; i < blocks.length; i += chunkSize) {
        const chunk = blocks.slice(i, i + chunkSize);
        await notion.blocks.children.append({
          block_id: newPage.id,
          children: chunk,
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
