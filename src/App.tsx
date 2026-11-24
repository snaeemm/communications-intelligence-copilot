import { useRef } from 'react'
import { AppProvider, useApp } from './state/store'
import { Footer, Header, StepBar } from './components/Shell'
import { EvidenceDrawer } from './components/EvidenceDrawer'
import { AuditPanel } from './components/AuditBits'
import BriefScreen from './screens/BriefScreen'
import CoverageScreen from './screens/CoverageScreen'
import AnalysisScreen from './screens/AnalysisScreen'
import PenetrationScreen from './screens/PenetrationScreen'
import GapsScreen from './screens/GapsScreen'
import EvidenceScreen from './screens/EvidenceScreen'
import ReviewScreen from './screens/ReviewScreen'
import BriefingScreen from './screens/BriefingScreen'
import AnalyticsScreen from './screens/AnalyticsScreen'
import AdvisoryScreen from './screens/AdvisoryScreen'
import RecommendationScreen from './screens/RecommendationScreen'
import AskScreen from './screens/AskScreen'

const SCREENS = [BriefScreen, CoverageScreen, AnalysisScreen, PenetrationScreen, GapsScreen, EvidenceScreen, ReviewScreen, BriefingScreen, AnalyticsScreen, AdvisoryScreen, RecommendationScreen, AskScreen]

function Journey() {
  const { state } = useApp()
  const Screen = SCREENS[state.step - 1]
  const prev = useRef(state.step)
  const dir = state.step >= prev.current ? 'stage-next' : 'stage-prev'
  prev.current = state.step
  return <div className="min-h-screen flex flex-col">
    <Header /><StepBar />
    <main className="flex-1 max-w-[1480px] w-full mx-auto px-6 py-8" key={state.step}><div className={dir}><Screen /></div></main>
    <Footer /><EvidenceDrawer /><AuditPanel />
  </div>
}
export default function App() { return <AppProvider><Journey /></AppProvider> }
