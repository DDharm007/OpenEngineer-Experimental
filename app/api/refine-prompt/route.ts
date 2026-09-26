import { NextResponse } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export async function POST(request: Request) {
    try {
        const { prompt, theme, modifications } = await request.json();

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Use dedicated Groq key for refine prompt only
        const GROQ_KEY = process.env.GROQ_REFINE_API_KEY;

        if (!GROQ_KEY) {
            console.error('GROQ_REFINE_API_KEY is not set in environment variables');
            return NextResponse.json({ error: 'Refine prompt API key not configured' }, { status: 500 });
        }

        const groq = createGroq({ apiKey: GROQ_KEY });

        // Build the refinement instruction
        let userMessage = `Original prompt: "${prompt.trim()}"`;
        if (theme) {
            userMessage += `\nSelected theme/style: ${theme}`;
        }
        if (modifications && modifications.trim()) {
            userMessage += `\nExtra modifications: ${modifications.trim()}`;
        }

        const systemPrompt = `You are an expert full-stack web developer and UI/UX designer prompt engineer. Your job is to take a user's rough app idea and refine it into a detailed, well-structured prompt that will produce a stunning, modern full-stack MULTI-PAGE web application with backend and database.

TECHNOLOGY REQUIREMENTS (MANDATORY):
- Frontend: React with Vite, Tailwind CSS for styling, React Router DOM for multi-page navigation
- Backend: Node.js with Express.js for API server
- Database: Firebase Firestore for data storage
- Authentication: Firebase Auth (if login/signup is needed)
- State Management: React hooks (useState, useEffect, useContext)
- NEVER suggest old technologies: jQuery, PHP, vanilla HTML/CSS-only, Bootstrap, Angular.js (1.x), or server-rendered templates (EJS, Pug, Handlebars)
- ALWAYS use modern ESNext syntax, arrow functions, async/await

Rules:
- Keep the original intent intact
- Add specific details about layout, design, colors, animations, and user experience
- Suggest modern design patterns (glassmorphism, gradients, micro-animations, dark mode, etc.)
- ALWAYS describe a MULTI-PAGE website structure:
  - List specific pages: Home, About, Services/Features, Contact (minimum 4 pages)
  - Mention React Router DOM for page navigation
  - Describe what each page should contain
- ALWAYS describe BACKEND requirements:
  - Express.js API server with specific endpoints (GET, POST, PUT, DELETE)
  - Firebase Firestore collections and document structure
  - Service layer for CRUD operations
  - If the app needs user data, specify Firestore collections
- ALWAYS describe FRONTEND components:
  - Header with navigation links to all pages
  - Footer with site info and links
  - Page-specific components (hero sections, forms, cards, etc.)
  - Contact form that saves data to Firestore
- Structure the output as a clear, actionable description
- Keep it concise but comprehensive (max 350 words)
- Do NOT include any markdown formatting, just plain text
- Do NOT include any preamble like "Here is the refined prompt:" — just output the refined prompt directly
- ALWAYS mention React, React Router DOM, Tailwind CSS, Node.js/Express, and Firebase in the refined prompt
- ALWAYS specify that this should be a multi-page website with backend API and database`;


        const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            system: systemPrompt,
            prompt: userMessage,
            temperature: 0.7,
        });

        const refinedPrompt = result.text?.trim();

        if (!refinedPrompt) {
            return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
        }

        return NextResponse.json({ refinedPrompt });
    } catch (error: any) {
        console.error('Refine prompt error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to refine prompt: ' + (error?.message || 'Unknown error') },
            { status: 500 }
        );
    }
}
