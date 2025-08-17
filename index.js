import React, { useState, useEffect } from 'react';
import {
  SquareTerminal,
  Copy,
  Download,
  LogIn,
  LogOut,
  Sparkles,
  RefreshCcw,
  Plus,
  ArrowRight,
  User,
  Gitlab,
  Github,
  Chrome,
} from 'lucide-react';

// Custom, self-contained modal component to replace the external Dialog.
const CustomModal = ({ isOpen, onClose, title, description, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative w-full max-w-lg mx-auto p-8 rounded-lg border-4 border-black bg-white shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-4">
          <h2 className="text-3xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-black text-2xl font-bold p-2 hover:bg-zinc-100 rounded-full">&times;</button>
        </div>
        <div className="text-lg mb-4">{description}</div>
        {children}
      </div>
    </div>
  );
};

// This is a mockup of the Supabase client. In a real application,
// you would import and initialize the real Supabase client.
const mockSupabase = {
  auth: {
    // Simulates a user session. A real app would use a state listener.
    onAuthStateChange: (callback) => {
      // Mocking an initial user for demonstration.
      const mockUser = localStorage.getItem('mock_user');
      if (mockUser) {
        callback('SIGNED_IN', JSON.parse(mockUser));
      }
      return { data: { subscription: () => {} } };
    },
    // Simulates a sign-in with a mock user object.
    signInWithOAuth: async ({ provider }) => {
      console.log(`Simulating sign-in with ${provider}`);
      const mockUser = { id: 'user_12345', email: 'test@example.com' };
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
      // In a real app, this would trigger the onAuthStateChange listener.
      return { data: { user: mockUser }, error: null };
    },
    // Simulates a sign-out by clearing the mock user.
    signOut: async () => {
      console.log("Simulating sign-out");
      localStorage.removeItem('mock_user');
      return { error: null };
    }
  },
  // Simulates a database table for tracking conversions and history.
  from: (table) => {
    console.log(`Accessing mock table: ${table}`);
    if (table === 'conversions') {
      // Mocked conversion history data.
      const mockHistory = JSON.parse(localStorage.getItem('conversion_history') || '[]');
      return {
        select: () => ({
          order: () => Promise.resolve({ data: mockHistory, error: null })
        }),
        insert: (data) => {
          const newHistory = [...mockHistory, { ...data, id: Math.random().toString(36).substring(7) }];
          localStorage.setItem('conversion_history', JSON.stringify(newHistory));
          return Promise.resolve({ data: data, error: null });
        }
      }
    }
    // Default mock behavior for user_data
    return {
      select: () => ({
        // Mock a single user's conversion count.
        single: () => Promise.resolve({ data: { count: parseInt(localStorage.getItem('conversion_count') || '0', 10) }, error: null })
      }),
      update: (data) => {
        console.log(`Updating mock table with data:`, data);
        const newCount = data.count;
        localStorage.setItem('conversion_count', newCount.toString());
        return Promise.resolve({ data: data, error: null });
      },
    };
  }
};

const SignUpPage = ({ onSignIn }) => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-black w-full max-w-lg text-center">
      <div className="flex justify-center items-center space-x-2 mb-4">
        <SquareTerminal className="w-10 h-10 text-black" />
        <h1 className="text-4xl font-bold tracking-tighter">POML Converter</h1>
      </div>
      <p className="text-xl text-gray-700 mb-8">Sign in to start converting and save your history.</p>
      <div className="flex flex-col space-y-4">
        <button
          onClick={() => onSignIn('google')}
          className="w-full px-6 py-4 border-2 border-black rounded-lg bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 font-bold"
        >
          <Chrome size={20} />
          <span>Sign In with Google</span>
        </button>
        <button
          onClick={() => onSignIn('github')}
          className="w-full px-6 py-4 border-2 border-black rounded-lg bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 font-bold"
        >
          <Github size={20} />
          <span>Sign In with GitHub</span>
        </button>
        <button
          onClick={() => onSignIn('gitlab')}
          className="w-full px-6 py-4 border-2 border-black rounded-lg bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 font-bold"
        >
          <Gitlab size={20} />
          <span>Sign In with GitLab</span>
        </button>
      </div>
      <p className="mt-8 text-sm text-gray-500">
        You can also continue as a guest for a free trial.
        <br />
        <span onClick={() => onSignIn(null)} className="underline cursor-pointer text-black font-bold">
          Continue as Guest
        </span>
      </p>
    </div>
  );
};


const POMLConverterApp = () => {
  const [prompt, setPrompt] = useState('');
  const [pomlOutput, setPomlOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [conversionCount, setConversionCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  
  const freeTierLimit = 22; // 2 initial + 20 from sign-up
  const initialFreeTrial = 2; // Initial free conversions
  const isPaidUser = user && user.id === 'user_12345'; // Simple mock for Pro user.

  useEffect(() => {
    // Mock authentication state change listener.
    const { data: { subscription } } = mockSupabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session);
          setIsSignedUp(true);
          // Load conversion count and history for the logged-in user.
          mockSupabase.from('user_data').select().single().then(res => {
            if (res.data) {
              setConversionCount(res.data.count);
            }
          });
          mockSupabase.from('conversions').select().order().then(res => {
            if (res.data) {
              setHistory(res.data);
            }
          });
          setMessage('Signed in successfully!');
        } else {
          setUser(null);
          setConversionCount(parseInt(localStorage.getItem('conversion_count') || '0', 10));
          setHistory([]);
          setMessage(`You are using the free trial. You have ${initialFreeTrial - parseInt(localStorage.getItem('conversion_count') || '0', 10)} conversions left.`);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const convertToPoml = async (text) => {
    // LLM prompt to convert text to POML
    const llmPrompt = `
      You are an expert POML (Prompt Orchestration Markup Language) converter. 
      Analyze the user's free-form text and convert it into a well-structured POML document.
      Use the following schema:
      <prompt>
        <role>A brief description of the AI's persona or role.</role>
        <task>A clear, actionable task for the AI to perform.</task>
        <context>Optional: Background information or constraints.</context>
        <input>The specific input from the user.</input>
        <output>Optional: A description of the desired output format.</output>
        <examples>Optional: A list of input/output pairs to guide the AI.</examples>
      </prompt>
      
      Convert the following text into POML.
      ---
      ${text}
      ---
      Make sure to only return the POML document and nothing else.
      `;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: llmPrompt }] });

    const payload = {
        contents: chatHistory,
    };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // Retry logic with exponential backoff
    let retryDelay = 1000;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // If response is not ok, throw an error to trigger a retry
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                return text;
            } else {
                console.error("Unexpected API response structure:", result);
                throw new Error("Invalid response from API");
            }

        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryDelay *= 2; // Exponential backoff
            } else {
                throw new Error("Failed to get a valid response from the Gemini API after multiple retries.");
            }
        }
    }
  };

  const handleConvert = async () => {
    setMessage('');
    setIsLoading(true);
    setPomlOutput('');

    // Check for free trial limit before conversion
    if (!user && conversionCount >= initialFreeTrial) {
      setMessage(`Oops! You've used your initial free conversions. Please sign in to continue!`);
      setIsLoading(false);
      setShowSignUpPrompt(true); // Show the sign-up prompt modal
      return;
    }

    try {
      const result = await convertToPoml(prompt);
      setPomlOutput(result);
      setMessage('Conversion successful! 🎉');

      // Update conversion count and check for sign-up prompt trigger
      const newCount = conversionCount + 1;
      setConversionCount(newCount);

      if (!user) { // Guest user
          localStorage.setItem('conversion_count', newCount.toString());
          if (newCount === initialFreeTrial) {
              setShowSignUpPrompt(true);
          }
      } else { // Logged-in user
        await mockSupabase.from('user_data').update({ count: newCount });
        await mockSupabase.from('conversions').insert({ 
            user_id: user.id, 
            input_text: prompt, 
            poml_output: result,
            tokens_used: prompt.length + result.length,
            created_at: new Date().toISOString()
        });
        // Re-fetch history to update the UI
        mockSupabase.from('conversions').select().order().then(res => setHistory(res.data));
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      setMessage('An error occurred during conversion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pomlOutput)
      .then(() => setMessage('Copied to clipboard!'))
      .catch(err => console.error('Failed to copy text: ', err));
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([pomlOutput], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'prompt.poml';
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element); // Clean up
    setMessage('Downloaded prompt.poml!');
  };

  const signIn = (provider) => {
    if (provider) {
      mockSupabase.auth.signInWithOAuth({ provider });
    } else {
      setIsSignedUp(true); // Treat "guest" as a form of sign-in
    }
  };

  const signOut = () => {
    mockSupabase.auth.signOut();
    localStorage.removeItem('conversion_count');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="bg-zinc-100 min-h-screen p-8 text-black font-mono flex flex-col items-center justify-center">
      {!isSignedUp ? (
        <SignUpPage onSignIn={signIn} />
      ) : (
        <div className="w-full max-w-5xl bg-white p-8 rounded-lg shadow-lg border-4 border-black">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b-4 border-black mb-8">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <SquareTerminal className="w-8 h-8 text-black" />
              <h1 className="text-3xl font-bold tracking-tighter">POML Converter</h1>
            </div>
            <nav className="flex items-center space-x-2">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 text-sm px-4 py-2 border-2 border-black rounded-lg">
                    <User size={16} />
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors flex items-center space-x-1"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsSignedUp(false)}
                  className="px-4 py-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors flex items-center space-x-1"
                >
                  <LogIn size={16} />
                  <span>Sign In</span>
                </button>
              )}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 border-2 border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 transition-colors flex items-center space-x-1"
              >
                <Plus size={16} />
                <span>Upgrade</span>
              </button>
            </nav>
          </header>
  
          <main className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Your Free-Form Prompt</h2>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-80 p-4 border-2 border-black rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="Paste your free-form prompt here..."
                ></textarea>
                <div className="absolute top-2 right-2 text-sm text-gray-500">
                  {user ? `Conversions: ${conversionCount}` : `Free Trial: ${conversionCount}/${initialFreeTrial}`}
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleConvert}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-3 border-2 border-black rounded-lg bg-black text-white hover:bg-gray-800 transition-colors font-bold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? 'Converting...' : (
                    <>
                      <span>Convert to POML</span>
                      <Sparkles size={16} />
                    </>
                  )}
                </button>
                {message && (
                  <div className="w-full sm:w-auto px-4 py-3 border-2 border-black rounded-lg bg-yellow-100 flex items-center justify-center">
                    <p className="text-black text-sm">{message}</p>
                  </div>
                )}
              </div>
            </div>
  
            <div>
              <h2 className="text-xl font-bold mb-4">Generated POML</h2>
              <div className="relative">
                <textarea
                  value={pomlOutput}
                  readOnly
                  className="w-full h-80 p-4 border-2 border-black rounded-lg bg-gray-50 resize-none focus:outline-none"
                  placeholder="Your structured POML will appear here..."
                ></textarea>
                <div className="absolute bottom-4 right-4 flex space-x-2">
                  <button
                    onClick={handleCopy}
                    disabled={!pomlOutput}
                    className="p-2 border-2 border-black rounded-lg bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy to clipboard"
                  >
                    <Copy size={20} />
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!pomlOutput}
                    className="p-2 border-2 border-black rounded-lg bg-white hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download .poml file"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            </div>
          </main>
          
          {user && (
            <section className="mt-8 pt-8 border-t-4 border-black">
              <h2 className="text-xl font-bold mb-4">Your Conversion History</h2>
              <div className="border-2 border-black rounded-lg overflow-hidden">
                {history.length > 0 ? (
                  <ul className="divide-y-2 divide-black">
                    {history.map((item) => (
                      <li key={item.id} className="p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold truncate">{item.input_text.substring(0, 50)}...</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTimestamp(item.created_at)}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => { setPomlOutput(item.poml_output); setMessage('Loaded from history.'); }}
                              className="p-2 border-2 border-black rounded-lg bg-white hover:bg-gray-100 transition-colors"
                              title="View POML"
                            >
                              <Sparkles size={16} />
                            </button>
                            <button
                              onClick={() => { navigator.clipboard.writeText(item.poml_output); setMessage('Copied from history!'); }}
                              className="p-2 border-2 border-black rounded-lg bg-white hover:bg-gray-100 transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p>Your conversion history will appear here. Start converting!</p>
                  </div>
                )}
              </div>
              {!isPaidUser && (
                <p className="mt-4 text-sm text-center">
                  This history is limited. <span className="underline cursor-pointer" onClick={() => setIsModalOpen(true)}>Upgrade to Pro</span> for full history access.
                </p>
              )}
            </section>
          )}
          
          {/* Custom Modal for Sign-Up Prompt */}
          <CustomModal 
            isOpen={showSignUpPrompt} 
            onClose={() => setShowSignUpPrompt(false)}
            title="Unlock More Conversions!"
            description="You've used all your free trial conversions. Sign in to save your history and get 20 more conversions, on us!"
          >
            <div className="flex flex-col space-y-4 pt-4">
              <p className="text-center text-gray-700 font-bold text-xl">
                Ready to upgrade?
              </p>
              <button
                onClick={() => { setShowSignUpPrompt(false); setIsSignedUp(false); }}
                className="px-6 py-3 border-2 border-black rounded-lg bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Sign In Now</span>
                <LogIn size={16} />
              </button>
            </div>
          </CustomModal>

          {/* Custom Modal for Upgrade */}
          <CustomModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            title="Upgrade to Pro"
            description="Get unlimited conversions and full history access for just $5/month."
          >
            <div className="flex flex-col space-y-4 pt-4">
              <div className="border-2 border-black p-4 rounded-lg flex items-center space-x-4">
                <Sparkles className="w-6 h-6 text-black" />
                <div>
                  <h4 className="font-bold">Free Tier</h4>
                  <p className="text-sm text-gray-600">Initial {initialFreeTrial} conversions</p>
                  <p className="text-sm text-gray-600">Bonus 20 conversions after sign-in</p>
                </div>
              </div>
              <div className="border-2 border-black p-4 rounded-lg flex items-center space-x-4 bg-yellow-100">
                <RefreshCcw className="w-6 h-6 text-black" />
                <div>
                  <h4 className="font-bold">Pro Tier</h4>
                  <p className="text-sm text-gray-600">Unlimited conversions & full history</p>
                </div>
              </div>
              <button className="px-6 py-3 border-2 border-black rounded-lg bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 mt-4">
                <span>Go Pro</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </CustomModal>
        </div>
      )}
      
      <footer className="w-full max-w-5xl mt-8 pt-4 text-center text-gray-600">
        <div className="flex flex-col sm:flex-row justify-center sm:space-x-4">
          <p className="text-xs mb-2 sm:mb-0">© {new Date().getFullYear()} Decoders Labs. All rights reserved.</p>
          <p className="text-xs mb-2 sm:mb-0">
            <a href="https://decodershq.com" className="hover:underline">decodershq.com</a>
          </p>
          <p className="text-xs mb-2 sm:mb-0">
            <a href="https://www.producthunt.com/" className="hover:underline">Product Hunt</a>
          </p>
          <p className="text-xs mb-2 sm:mb-0">
            <a href="#" className="hover:underline">Socials</a>
          </p>
          <p className="text-xs mb-2 sm:mb-0">
            <a href="#" className="hover:underline">API</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default POMLConverterApp;

