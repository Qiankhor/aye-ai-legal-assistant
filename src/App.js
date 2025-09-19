
import './App.css';
import ChatBot from './ChatBot';
import { useChatBotViewModel } from './ChatBotViewModel';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {
  const viewModel = useChatBotViewModel();
  return (
    <div className="App">
      <ChatBot
        messages={viewModel.messages}
        input={viewModel.input}
        isRecording={viewModel.isRecording}
        isLoading={viewModel.isLoading}
        handleSend={viewModel.handleSend}
        handleInputChange={viewModel.handleInputChange}
        handleInputKeyDown={viewModel.handleInputKeyDown}
        startRecording={viewModel.startRecording}
        stopRecording={viewModel.stopRecording}
        handleFileUpload={viewModel.handleFileUpload}
        selectedLanguage={viewModel.selectedLanguage}
        setSelectedLanguage={viewModel.setSelectedLanguage}
        LANGUAGES={viewModel.LANGUAGES}
      />
    </div>
  );
}

export default App;
