import BlogGenerator from './BlogGenerator';
import './App.css'; // Keep this if you have any global styles, or remove it if you only use index.css

function App() {
  return (
    // min-h-screen and bg-gray-50 are Tailwind classes for basic page structure
    <div className="min-h-screen bg-gray-50"> 
      <BlogGenerator />
    </div>
  );
}

export default App;