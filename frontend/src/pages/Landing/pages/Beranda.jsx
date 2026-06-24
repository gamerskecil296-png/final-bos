import React from 'react'
import { useOutletContext } from 'react-router-dom'
import HeroSection from '../components/HeroSection'
import StatsSection from '../components/StatsSection'
import ProgramsSection from '../components/ProgramsSection'
import LocationsSection from '../components/LocationsSection'
import TestimonialsSection from '../components/TestimonialsSection'
import NewsSection from '../components/NewsSection'
import CTASection from '../components/CTASection'

export default function Beranda() {
  const { settings } = useOutletContext() || {}

  return (
    <>
      <HeroSection settings={settings} />
      <StatsSection settings={settings} />
      <ProgramsSection settings={settings} />
      <LocationsSection settings={settings} />
      <TestimonialsSection settings={settings} />
      <NewsSection settings={settings} />
      <CTASection settings={settings} />
    </>
  )
}
