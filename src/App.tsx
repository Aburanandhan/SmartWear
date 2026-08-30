import { useState, useEffect } from 'react'
import Landing from './screens/Landing'
import GoalSelection from './screens/GoalSelection'
import PersonalDetails from './screens/PersonalDetails'
import FoodPreferencesSetup from './screens/FoodPreferencesSetup'
import BudgetSetup from './screens/BudgetSetup'
import Dashboard from './screens/Dashboard'
import AuthModal from './components/AuthModal'
import { getCurrentUser, signOutUser } from './services/authService'
import { fetchUserProfile, saveUserProfile } from './services/profileService'
import type { DietType, FoodStyle } from './data/foods'

export type Screen = 'landing' | 'goal' | 'details' | 'food-preferences' | 'budget' | 'dashboard'
export type Goal = 'athlete' | 'gym' | 'general' | 'strength' | 'weight' | 'endurance'

export interface UserProfile {
  goal: Goal
  age: number
  height: number
  weight: number
  activityLevel: string
  primaryExercise: string
  monthlyBudget: number
  budgetCategories: { food: number; supplements: number; hydration: number; recovery: number; other: number }
  dietType: DietType
  foodStyle: FoodStyle
  excludedFoods: string[]
  preferredFoods: string[]
}

const DEFAULT_PROFILE: UserProfile = {
  goal: 'athlete',
  age: 24,
  height: 175,
  weight: 68,
  activityLevel: 'active',
  primaryExercise: 'Running',
  monthlyBudget: 6000,
  budgetCategories: { food: 3000, supplements: 1000, hydration: 600, recovery: 800, other: 600 },
  dietType: 'vegetarian',
  foodStyle: 'south-indian',
  excludedFoods: ['Peanuts'],
  preferredFoods: ['Rice', 'Dal', 'Paneer', 'Idli', 'Dosa'],
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Initialize auth check
  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser()
      if (user) {
        setUserId(user.id)
        const dbProfile = await fetchUserProfile(user.id)
        if (dbProfile) {
          setProfile(dbProfile)
        }
      }
    }
    checkAuth()
  }, [])

  const navigate = (s: Screen) => setScreen(s)

  const handleAuthSuccess = async (uId: string) => {
    setUserId(uId)
    setIsDemoMode(false)
    setIsAuthModalOpen(false)
    const existing = await fetchUserProfile(uId)
    if (existing) {
      setProfile(existing)
      setScreen('dashboard')
    } else {
      setScreen('goal')
    }
  }

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    const newProf = { ...profile, ...updated }
    setProfile(newProf)
    if (userId && !isDemoMode) {
      await saveUserProfile(userId, newProf)
    }
  }

  const handleFinishOnboarding = async () => {
    if (userId && !isDemoMode) {
      await saveUserProfile(userId, profile)
    }
    setScreen('dashboard')
  }

  const handleLogout = async () => {
    await signOutUser()
    setUserId(null)
    setIsDemoMode(false)
    setProfile(DEFAULT_PROFILE)
    setScreen('landing')
  }

  return (
    <div className="min-h-screen" style={{ background: '#f0fdf9' }}>
      {screen === 'landing' && (
        <Landing
          onStart={() => {
            if (userId) {
              setScreen('goal')
            } else {
              setIsAuthModalOpen(true)
            }
          }}
          onDemo={() => {
            setIsDemoMode(true)
            setScreen('dashboard')
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      )}

      {screen === 'goal' && (
        <GoalSelection
          value={profile.goal}
          onChange={(g) => handleUpdateProfile({ goal: g })}
          onNext={() => navigate('details')}
          onBack={() => navigate('landing')}
        />
      )}

      {screen === 'details' && (
        <PersonalDetails
          profile={profile}
          onChange={(p) => handleUpdateProfile(p)}
          onNext={() => navigate('food-preferences')}
          onBack={() => navigate('goal')}
        />
      )}

      {screen === 'food-preferences' && (
        <FoodPreferencesSetup
          profile={profile}
          onChange={(p) => handleUpdateProfile(p)}
          onNext={() => navigate('budget')}
          onBack={() => navigate('details')}
          onSkip={() => navigate('budget')}
        />
      )}

      {screen === 'budget' && (
        <BudgetSetup
          profile={profile}
          onChange={(p) => handleUpdateProfile(p)}
          onNext={handleFinishOnboarding}
          onBack={() => navigate('food-preferences')}
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard
          profile={profile}
          userId={userId}
          isDemoMode={isDemoMode}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onDemoMode={() => {
          setIsDemoMode(true)
          setIsAuthModalOpen(false)
          setScreen('dashboard')
        }}
      />
    </div>
  )
}
