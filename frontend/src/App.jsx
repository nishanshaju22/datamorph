import { useState } from 'react'
import UploadScreen from './screens/UploadScreen'
import ConfigureScreen from './screens/ConfigureScreen'
import ResultsScreen from './screens/ResultsScreen'

export default function App() {
  const [screen, setScreen] = useState('upload')
  const [upload, setUpload] = useState(null)
  const [job, setJob]       = useState(null)

  const goToUpload = () => {
    setUpload(null)
    setJob(null)
    setScreen('upload')
  }

  // Called when user clicks a past job in the history panel
  const handleSelectJob = (selectedJob, selectedUpload) => {
    setUpload(selectedUpload)
    setJob(selectedJob)
    setScreen('results')
  }

  return (
    <>
      {screen === 'upload' && (
        <UploadScreen
          onUploaded={(u) => { setUpload(u); setScreen('configure') }}
          onSelectJob={handleSelectJob}
        />
      )}

      {screen === 'configure' && upload && (
        <ConfigureScreen
          upload={upload}
          onBack={goToUpload}
          onJobCreated={(j) => { setJob(j); setScreen('results') }}
        />
      )}

      {screen === 'results' && job && upload && (
        <ResultsScreen
          job={job}
          upload={upload}
          onBack={goToUpload}
        />
      )}
    </>
  )
}