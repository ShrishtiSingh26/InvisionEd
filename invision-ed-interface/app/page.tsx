"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Upload, Mic, MicOff, Sun, Moon, FileText, Sparkles, User, Bot, Send, BookOpen, Volume2, BookOpenCheck, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/AudioPlayer";

// Define proper types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
  emma: any;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Add missing global types
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface ChatMessage {
  id: number
  type: "user" | "ai"
  message: string
  timestamp: string
}

export default function InVisionEdInterface() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      type: "user",
      message: "Summarise the content",
      timestamp: "2:30 PM",
    },
    {
      id: 2,
      type: "ai",
      message:
        "Writing Challenge\n\nAnother writing challenge can be to take the individual sentences in the random paragraph and incorporate them into a short story. Unlike the random sentence generator, the sentences from the random paragraph will have some connection to one another so it will be a bit easier.\n\nYou also won't know exactly how many sentences will appear in the random paragraph. It could be anywhere from one sentence to many more and it will randomly change each time you use the generator.",
      timestamp: "2:31 PM",
    },
    {
      id: 3,
      type: "user",
      message: "How to check that?",
      timestamp: "2:32 PM",
    },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  // Add new state for showing action buttons
  const [showActions, setShowActions] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false); // Add near your other state variables

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognitionAPI()

      if (recognitionRef.current) {
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onstart = () => {
          setIsListening(true)
        }

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript
          handleSendMessage(transcript)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }
      }
    }
  }, [])

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Add a message about file upload
      const fileMessage: ChatMessage = {
        id: Date.now(),
        type: "user",
        message: `Uploaded file: ${file.name}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setChatMessages((prev) => [...prev, fileMessage])
      
      // Show typing indicator
      setIsTyping(true)
      
      try {
        // Create FormData and append file
        const formData = new FormData()
        formData.append('file', file)
        
        // Send file to API
        const response = await fetch('/api/process-file', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error('Failed to process file')
        }
        
        const data = await response.json()
        
        // Add AI response with extracted text
        const aiMessage: ChatMessage = {
          id: Date.now() + 1,
          type: "ai",
          message: `I've analyzed your file "${file.name}" and here's what I found:\n\n${data.text}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setChatMessages((prev) => [...prev, aiMessage])
        
        // Show action buttons
        setShowActions(true)
      } catch (error) {
        console.error('Error processing file:', error)
        
        // Add error message
        const errorMessage: ChatMessage = {
          id: Date.now() + 1,
          type: "ai",
          message: "I'm sorry, I couldn't process that file. Please try again or use a different file.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setChatMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsTyping(false)
      }
    }
  }

  const handleVoiceCommand = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.")
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  const handleSendMessage = (message: string = newMessage) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: "user",
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setNewMessage("")
    
    // Check if we're in question mode
    if (isAskingQuestion) {
      setIsAskingQuestion(false);
      // Handle as a document question
      handleAskQuestion(message.trim());
    } else {
      // Handle as a regular message (existing code)
      setIsTyping(true);
      
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: Date.now() + 1,
          type: "ai",
          message: `I understand you said: "${message.trim()}". Let me help you with that. This is a simulated AI response that would analyze your request and provide relevant information.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
      }, 2000);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Add new handler functions
  const handleSummarize = async () => {
    setIsSummarizing(true);
    
    try {
      // Add a message to show we're processing
      const processingMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: "I'm generating a summary of the document. This might take a moment...",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, processingMessage]);
      
      // Get document text from the most recent AI message
      const documentText = chatMessages
        .filter(msg => msg.type === "ai" && msg.message.includes("I've analyzed your file"))
        .pop()?.message.split("found:\n\n")[1] || "";
      
      if (!documentText) {
        throw new Error("No document content found to summarize.");
      }
      
      // Use the direct Gemini API with the provided API key
      const GEMINI_API_KEY = "AIzaSyC8EHY_xcWwh600B9pvtYX2maXkXV--BiQ";
      
      const prompt = `Please provide a concise, well-structured summary of the following text extracted from a document. 
Focus on the key points, main arguments, and conclusions. Use markdown formatting for better readability.

TEXT:
"""
${documentText.substring(0, 30000)}
"""`;
      
      interface GeminiMessage {
        role: string;
        parts: {text: string}[];
      }
      
      let chatHistory: GeminiMessage[] = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      // Extract summary from the API response
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
        const summary = result.candidates[0].content.parts[0].text;
        
        // Add AI response with summary
        const aiMessage: ChatMessage = {
          id: Date.now() + 1,
          type: "ai",
          message: `Here's a summary of the document:\n\n${summary}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => {
          // Remove the processing message and add the summary message
          return [...prev.filter(msg => msg.id !== processingMessage.id), aiMessage];
        });
      } else {
        throw new Error('No valid content received from Gemini API.');
      }
    } catch (error) {
      console.error('Error summarizing text:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: `I'm sorry, I couldn't summarize the text. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSummarizing(false);
    }
  }

  const handleReadAloud = async () => {
    // If already reading, don't start another request
    if (isReading) return;
    
    setIsReading(true);
    try {
      console.log("Sending read-aloud request");
      const response = await fetch('/api/read-aloud');
      
      if (!response.ok) {
        throw new Error(`Failed to read text aloud: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Read aloud response:", data);
      
      // Add AI message about reading
      const aiMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: "I'm reading the document aloud for you now.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error reading text aloud:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: "I'm sorry, I couldn't read the text aloud. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setChatMessages((prev) => [...prev, errorMessage]);
      setIsReading(false);
    }
  }

  const handleSummarizeAndRead = async () => {
    setIsSummarizing(true);
    setIsReading(true);
    try {
      const response = await fetch('/api/summarize-and-read');
      
      if (!response.ok) {
        throw new Error('Failed to summarize and read text');
      }
      
      const data = await response.json();
      
      // Add AI response with summary
      const aiMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: `Here's a summary of the document (I'm reading it aloud):\n\n${data.summary}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error summarizing and reading text:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: "I'm sorry, I couldn't summarize and read the text. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSummarizing(false);
      setIsReading(false);
    }
  }

  // Add a new handler function to stop reading
  const handleStopReading = async () => {
    try {
      const response = await fetch('/api/stop-reading');
      
      if (!response.ok) {
        throw new Error('Failed to stop reading');
      }
      
      // Add AI message about stopping the reading
      const aiMessage: ChatMessage = {
        id: Date.now(),
        type: "ai",
        message: "I've stopped reading the document.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error stopping reading:', error);
    } finally {
      setIsReading(false);
    }
  }

  // Add a polling mechanism to check reading status
  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout | null = null;
    
    // Start polling when reading starts
    if (isReading) {
      console.log("Starting status check polling");
      statusCheckInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/reading-status');
          if (!response.ok) {
            console.error('Error response from reading status:', response.status);
            return;
          }
          
          const data = await response.json();
          console.log("Reading status:", data.is_reading);
          
          // If backend says we're not reading anymore, update UI
          if (!data.is_reading && isReading) {
            console.log("Reading completed according to backend");
            setIsReading(false);
            
            // Add a message that reading has completed
            const aiMessage: ChatMessage = {
              id: Date.now(),
              type: "ai",
              message: "I've finished reading the document.",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }
            setChatMessages((prev) => [...prev, aiMessage]);
          }
        } catch (error) {
          console.error('Error checking reading status:', error);
        }
      }, 2000); // Check every 2 seconds
    }
    
    // Cleanup interval when component unmounts or reading stops
    return () => {
      if (statusCheckInterval) {
        console.log("Clearing status check interval");
        clearInterval(statusCheckInterval);
      }
    };
  }, [isReading]);

  // Use environment variable for API key instead of hardcoding
  const summarizeWithGeminiDirect = async (text: string): Promise<string> => {
    try {
      // Use the direct API key instead of environment variable
      const GEMINI_API_KEY = "AIzaSyC8EHY_xcWwh600B9pvtYX2maXkXV--BiQ";
      
      const prompt = `Please provide a concise, well-structured summary of the following text extracted from a document. Focus on the key points, main arguments, and conclusions.\n\nTEXT:\n"""\n${text.substring(0, 30000)}\n"""`;
      
      interface GeminiMessage {
        role: string;
        parts: {text: string}[];
      }
      
      let chatHistory: GeminiMessage[] = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
        return result.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No valid content received from API.');
      }
    } catch (error) {
      console.error('Error calling Gemini API directly:', error);
      throw error;
    }
  };

  // Add this function to implement Q&A functionality
  const handleAskQuestion = async (question: string) => {
    if (!question.trim()) return;
    
    setIsTyping(true);
    
    try {
      // Get the document text from the most recent AI message
      const documentText = chatMessages
        .filter(msg => msg.type === "ai" && msg.message.includes("I've analyzed your file"))
        .pop()?.message.split("found:\n\n")[1] || "";
      
      if (!documentText) {
        throw new Error("No document content found to answer questions about.");
      }
      
      // Note: We're not adding the user message here anymore, since it's already added by handleSendMessage
    
      // Use Gemini API directly for Q&A
      const prompt = `Based on the following document text, provide a clear and concise answer to the user's question. If the answer isn't in the text, say that you cannot find the answer in the provided document.\n\nDOCUMENT TEXT:\n"""\n${documentText.substring(0, 30000)}\n"""\n\nUSER'S QUESTION:\n"${question}"`;
      
      const answer = await summarizeWithGeminiDirect(prompt);
      
      // Create AI answer message
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: "ai",
        message: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error answering question:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        type: "ai",
        message: "I'm sorry, I couldn't answer your question about the document. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div
      className={`h-screen flex flex-col transition-all duration-300 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-amber-50 text-gray-900"
      }`}
    >
      {/* Compact Header */}
      <header className={`px-6 py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">InVisionEd</h1>
            </div>
          </div>

          <div className="flex-1 text-center px-4">
            <p className="text-xs font-medium opacity-80">
              Where Voice Meets Vision, and Knowledge Knows No Boundaries.
            </p>
          </div>

          <div className="flex items-center">
            <button
              onClick={toggleDarkMode}
              className={`w-12 h-6 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                isDarkMode ? "bg-yellow-400" : "bg-gray-300"
              }`}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 absolute top-0.5 flex items-center justify-center ${
                  isDarkMode ? "translate-x-6" : "translate-x-0.5"
                }`}
              >
                {isDarkMode ? <Moon className="w-3 h-3 text-gray-600" /> : <Sun className="w-3 h-3 text-yellow-600" />}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - File Upload */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="flex flex-col items-center space-y-6 max-w-sm w-full">
            {/* Enhanced Upload Icon */}
            <div className="relative group cursor-pointer">
              <div className="w-20 h-24 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-xl flex items-center justify-center relative shadow-xl transform transition-transform group-hover:scale-105">
                <div className="w-12 h-16 bg-gradient-to-br from-cyan-300 to-cyan-400 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <Upload className="w-3 h-3 text-gray-900" />
                </div>
              </div>
            </div>

            {/* Upload Heading */}
            <h2 className="text-xl font-semibold text-center">Upload your File</h2>

            {/* File Selection */}
            <div className="w-full space-y-3">
              <label htmlFor="file-upload" className="block text-sm font-medium">
                Select File:
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`block w-full px-3 py-2 border rounded-lg cursor-pointer text-center text-sm transition-all duration-300 hover:scale-105 ${
                      isDarkMode
                        ? "border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500"
                        : "border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    Choose File
                  </label>
                </div>
                <div
                  className={`px-3 py-2 border rounded-lg text-xs whitespace-nowrap flex items-center ${
                    isDarkMode ? "border-gray-600 bg-gray-800" : "border-gray-300 bg-white"
                  }`}
                >
                  {selectedFile ? "File Selected" : "No File Chosen"}
                </div>
              </div>
              {selectedFile && (
                <div className="flex items-center space-x-2 text-xs text-green-500 bg-green-500 bg-opacity-10 p-2 rounded-lg">
                  <FileText className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                </div>
              )}
            </div>

            {/* Ask Question Button - Placed with file selection UI */}
            {selectedFile && (
              <Button 
                onClick={() => {
                  // Add an AI message prompting the user to ask a question
                  const promptMessage: ChatMessage = {
                    id: Date.now(),
                    type: "ai",
                    message: "Please ask any question about the document, and I'll answer based on its content.",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  };
                  setChatMessages((prev) => [...prev, promptMessage]);
                  
                  // Set question mode active
                  setIsAskingQuestion(true);
                  
                  // Auto-focus the chat input
                  setTimeout(() => {
                    const chatInput = document.querySelector('input[placeholder="Type your message..."]') as HTMLInputElement;
                    if (chatInput) chatInput.focus();
                  }, 100);
                }}
                size="sm"
                variant="outline"
                className={`flex items-center space-x-1 text-xs ${
                  isDarkMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"
                }`}
                disabled={isTyping || isAskingQuestion}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {isAskingQuestion ? "Waiting for question..." : "Ask Question"}
              </Button>
            )}
          </div>
        </div>

        {/* Voice Command Button - Centered on Dividing Line */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={handleVoiceCommand}
              className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 focus:ring-4 focus:ring-opacity-50 border-4 border-white ${
                isListening
                  ? "bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 focus:ring-red-400 animate-pulse"
                  : "bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 focus:ring-yellow-400"
              }`}
              aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
            >
              {isListening ? (
                <MicOff className="w-7 h-7 mx-auto text-white" />
              ) : (
                <Mic className="w-7 h-7 mx-auto text-gray-900" />
              )}
            </button>
            <div className="text-center">
              <span className={`text-xs font-medium ${isListening ? "text-red-400" : "opacity-70"}`}>
                {isListening ? "Listening..." : "Voice"}
              </span>
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div
          className={`w-px ${isDarkMode ? "bg-gray-700" : "bg-gray-300"} absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2`}
        />

        {/* Right Panel - AI Chat Assistant */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="w-full h-full flex flex-col max-w-lg mx-auto">
            {/* AI Assistant Header */}
            <div
              className={`rounded-xl p-4 mb-4 shadow-lg border ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              }`}
            >
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>AI Assistant</span>
                {isListening && (
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">Listening</span>
                )}
              </h3>
            </div>

            {/* Chat Messages Container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${msg.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.type === "user"
                          ? "bg-yellow-400 text-gray-900"
                          : isDarkMode
                            ? "bg-gray-700 text-white"
                            : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {msg.type === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-md ${
                        msg.type === "user"
                          ? "bg-yellow-400 text-gray-900"
                          : isDarkMode
                            ? "bg-gray-800 border border-gray-700"
                            : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-line">{msg.message}</div>
                      <div className={`text-xs mt-2 ${msg.type === "user" ? "text-gray-700" : "opacity-60"}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons - Show only for AI messages containing file content */}
                  {msg.type === "ai" && msg.message.includes("I've analyzed your file") && (
                    <div className={`mt-2 ml-10 flex flex-wrap gap-2`}>
                      <Button
                        onClick={handleSummarize}
                        size="sm"
                        variant="outline"
                        className={`flex items-center space-x-1 text-xs ${
                          isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white border-gray-300 hover:bg-gray-50"
                        }`}
                        disabled={isSummarizing}
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        {isSummarizing ? "Summarizing..." : "Summarize"}
                      </Button>
                      
                      <Button
                        onClick={isReading ? handleStopReading : handleReadAloud}
                        size="sm"
                        variant={isReading ? "destructive" : "outline"}
                        className={`flex items-center space-x-1 text-xs ${
                          isReading 
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : isDarkMode 
                              ? "bg-gray-800 border-gray-700 hover:bg-gray-700" 
                              : "bg-white border-gray-300 hover:bg-gray-50"
                        }`}
                        disabled={isSummarizing} // Only disable when summarizing, not when reading
                      >
                        {isReading ? (
                          <>
                            <Square className="w-3 h-3 mr-1" />
                            Stop Reading
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 mr-1" />
                            Read Aloud
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleSummarizeAndRead}
                        size="sm"
                        className="flex items-center space-x-1 text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                        disabled={isSummarizing || isReading}
                      >
                        <BookOpenCheck className="w-3 h-3 mr-1" />
                        {isSummarizing || isReading ? "Processing..." : "Summarize & Read"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* AI Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isDarkMode ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-md ${
                        isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div
              className={`p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className={`flex-1 px-3 py-2 rounded-lg border-none outline-none text-sm ${
                    isDarkMode
                      ? "bg-gray-700 text-white placeholder-gray-400"
                      : "bg-gray-100 text-gray-900 placeholder-gray-500"
                  }`}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  size="sm"
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-4"
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Footer */}
      <footer className={`py-2 text-center border-t ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
        <p className="text-xs opacity-70">© 2025 InVisionEd | Designed with inclusion in heart</p>
      </footer>

      {/* Audio Player Popup - Only shown when reading is active */}
      {isReading && (
        <AudioPlayer 
          isPlaying={isReading}
          onStop={handleStopReading}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  )
}
