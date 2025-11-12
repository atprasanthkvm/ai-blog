import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown'; 

// --- Configuration and API Initialization ---
// Initialize the AI client. It safely loads the key from the .env file (REACT_APP_GEMINI_API_KEY).
const ai = new GoogleGenAI({
  apiKey: process.env.REACT_APP_GEMINI_API_KEY,
});

/**
 * Step 1: Fetches structured blog post content (text and image prompt) from Gemini.
 * Uses the stable gemini-2.5-flash model for reliable structured JSON output.
 */
const generateBlogContent = async () => {
  const systemInstruction = "You are an expert AI blog writer for 'AI Tools & Software.' Your task is to generate 5 complete, distinct, and high-quality blog posts. You MUST return the entire result as a single JSON array that strictly adheres to the provided schema. The content should be informative, use strong Markdown formatting (headings, bold, lists), and cover trending topics.";
  const prompt = "Generate 5 dynamic blog posts about current and future trends in AI and software development. Focus on new LLMs, MLOps practices, and AI-powered coding tools. Make each post engaging.";

  try {
    const response = await ai.models.generateContent({
        // STABLE MODEL FOR JSON OUTPUT
        model: "gemini-2.5-flash", 
        contents: [
            { role: "user", parts: [{ text: prompt }] }
        ],
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json", 
            responseSchema: { 
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "A unique, URL-friendly identifier." },
                        title: { type: "string", description: "A compelling blog post title." },
                        summary: { type: "string", description: "A short, engaging summary." },
                        content: { type: "string", description: "The FULL blog post content, formatted with Markdown." },
                        date: { type: "string", description: "The current date in YYYY-MM-DD format." },
                        imagePrompt: { type: "string", description: "A short, detailed description for image generation." }
                    },
                    required: ["id", "title", "summary", "content", "date", "imagePrompt"]
                }
            }
        }
    });

    return JSON.parse(response.text);

  } catch (error) {
    console.error("Gemini API Content Error:", error);
    return []; 
  }
};

/**
 * Step 2: Native Image Generation - Calls Gemini for a unique, relevant Base64 image.
 * This is the direct BLOB generation method, resolving all external dependencies.
 * @returns {Promise<string>} The Base64 image data URL (e.g., 'data:image/jpeg;base64,...').
 */
async function generateImage(imagePrompt) {
  // 1x1 transparent pixel fallback (no external dependency)
  const genericFallbackUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADagGA38qL+QAAAABJRU5ErkJggg=="; // Solid gray 1x1 pixel base64

  try {
    const response = await ai.models.generateContent({
        // CRUCIAL: Use the dedicated image model for Base64 output
        model: "gemini-2.5-flash-image", 
        contents: [
            // Prompt guides the model to produce a visual output
            { role: "user", parts: [{ text: `Generate a photorealistic, abstract, 16:9 aspect ratio image for a tech blog related to: ${imagePrompt}` }] }
        ],
        config: {
            // 🚨 FIX APPLIED: REMOVED the unsupported responseMimeType parameter.
            // We rely on the model's inherent ability to output image data when prompted.
        }
    });

    // Check for the Base64 image data part in the response
    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
        const mimeType = imagePart.inlineData.mimeType || 'image/jpeg';
        const base64Data = imagePart.inlineData.data;
        // Construct the Data URL (BLOB format)
        return `data:${mimeType};base64,${base64Data}`;
    }

    // Fallback if the image part is missing (e.g., safety filter block or partial failure)
    return genericFallbackUrl; 

  } catch (error) {
    console.error("Gemini Native Image Generation Error:", error);
    return genericFallbackUrl; 
  }
}

// --- React Component ---

function BlogGenerator() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPostsAndImages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const generatedPosts = await generateBlogContent();
        
        // Generate the Base64 image for each post
        const postsWithImages = await Promise.all(
          generatedPosts.map(async (post) => {
            const imageUrl = await generateImage(post.imagePrompt);
            return { ...post, imageUrl }; 
          })
        );
        
        setPosts(postsWithImages); 

      } catch (err) {
        setError("Failed to fetch content or images. Ensure your API key is correct and check the network.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostsAndImages();
  }, []); 

  const handleReadMore = (post) => {
    setSelectedPost(post);
    window.scrollTo(0, 0); 
  };

  // --- RENDERING LOGIC ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-2xl font-bold text-indigo-600">
          🧠 Generating today's dynamic AI blog posts...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center bg-red-100 text-red-700 font-bold">
        Error: {error}
      </div>
    );
  }
  
  if (selectedPost) {
    return (
      <div className="container mx-auto p-4 max-w-4xl bg-white shadow-xl min-h-screen">
        <button 
          onClick={() => setSelectedPost(null)}
          className="text-indigo-600 font-semibold mb-6 flex items-center hover:text-indigo-800 transition"
        >
          &larr; Back to All Posts
        </button>
        <h1 className="text-4xl font-extrabold mb-4 text-gray-900">{selectedPost.title}</h1>
        <p className="text-sm text-gray-500 mb-8">Published: {selectedPost.date}</p>
        
        {selectedPost.imageUrl && (
            // This displays the Base64 data (the BLOB)
            <img 
                src={selectedPost.imageUrl} 
                alt={selectedPost.title} 
                className="w-full h-80 object-cover rounded-lg mb-8" 
                loading="lazy"
            />
        )}

        <div className="prose lg:prose-lg p-4"> 
          <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-extrabold text-center my-8 text-indigo-700">
        ✨ AI Tools & Software Insights
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map(post => (
          <div key={post.id} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 border border-gray-100">
            {post.imageUrl && (
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full h-48 object-cover rounded-md mb-4" 
                loading="lazy"
              />
            )}
            <h2 className="text-2xl font-bold mb-3 text-gray-900">{post.title}</h2>
            <p className="text-sm text-gray-500 mb-4">Published: {post.date}</p>
            <p className="text-gray-700 mb-6">{post.summary}</p>
            <button
              onClick={() => handleReadMore(post)}
              className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-150 font-medium"
            >
              Read Full Post &rarr;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlogGenerator;