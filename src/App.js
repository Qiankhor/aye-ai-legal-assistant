
import './App.css';
import ChatBot from './ChatBot';
import { useChatBotViewModel } from './ChatBotViewModel';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import ChatbotPage from './pages/ChatbotPage';
import AIWorkspacePage from './pages/AIWorkspacePage';
import TemplatesPage from './pages/TemplatesPage';
import ComparePage from './pages/ComparePage';
import SettingsPage from './pages/SettingsPage';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {
  const viewModel = useChatBotViewModel();
  return (
    <Routes>
      <Route element={<DashboardLayout />}> 
        <Route index element={<HomePage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="chat" element={
          <ChatbotPage>
            <ChatBot
              messages={viewModel.messages}
              input={viewModel.input}
              isRecording={viewModel.isRecording}
              isLoading={viewModel.isLoading}
              showSuggestions={viewModel.showSuggestions}
              SUGGESTION_MESSAGES={viewModel.SUGGESTION_MESSAGES}
              handleSend={viewModel.handleSend}
              handleInputChange={viewModel.handleInputChange}
              handleInputKeyDown={viewModel.handleInputKeyDown}
              handleSuggestionClick={viewModel.handleSuggestionClick}
              startRecording={viewModel.startRecording}
              stopRecording={viewModel.stopRecording}
              selectedLanguage={viewModel.selectedLanguage}
              setSelectedLanguage={viewModel.setSelectedLanguage}
              LANGUAGES={viewModel.LANGUAGES}
            />
          </ChatbotPage>
        } />
        <Route path="ai-workspace" element={<AIWorkspacePage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
