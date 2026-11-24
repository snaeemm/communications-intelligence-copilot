// Synthetic data generated for this demonstration. Not based on any real client, campaign, outlet, or journalist.
import type { Client, KeyMessage } from './types'

export const client: Client = {
  name: 'Hushwell Acoustics',
  sector: 'Residential noise-reduction products',
  campaign: 'The Quiet Homes Initiative',
  objective:
    'Establish Hushwell as the trusted choice for quieter homes by getting three approved messages into the coverage that urban homeowners and renters actually read.',
  period: 'Q3 2026 launch window (pilot sample)',
  audiences: ['Urban homeowners in dense neighbourhoods', 'Renters seeking landlord-friendly upgrades', 'Property managers and specifiers']
}

export const keyMessages: KeyMessage[] = [
  {
    id: 'A',
    label: 'Quieter homes improve focus and sleep',
    description: 'The emotional benefit: less noise means better concentration, rest and wellbeing.',
    hints: ['nod off', 'think clearly', 'wind down', 'rest easier', 'calm mind', 'switch off', 'wake up', 'alert'],
    phrases: [
      'quieter homes improve focus and sleep', 'quieter home improves focus and sleep',
      'improve focus and sleep', 'better focus and better sleep', 'better sleep and sharper focus',
      'sleep better and focus better', 'sleep and concentration', 'focus and sleep'
    ],
    groups: [
      {
        anchors: ['quieter', 'quiet', 'noise reduction', 'less noise', 'peaceful', 'calmer', 'silence', 'hush'],
        benefits: ['focus', 'concentrat', 'sleep', 'deeper rest', 'productiv', 'wellbeing', 'well-being']
      }
    ]
  },
  {
    id: 'B',
    label: 'Installs in a day, no renovation required',
    description: 'The practical proof point: simple, fast installation without building work.',
    hints: ['by lunchtime', 'by dinner', 'weekend', 'builder', 'no mess', 'spirit level', 'afternoon'],
    phrases: [
      'installs in a day', 'installed in a day', 'install in a day', 'no renovation required',
      'without renovation', 'no renovation', 'no building work', 'without any building work'
    ],
    groups: [
      {
        anchors: ['install', 'fitted', 'fitting', 'set up', 'mounted'],
        benefits: ['in a day', 'single day', 'one afternoon', 'in an afternoon', 'in hours', 'no drilling', 'no tradespeople', 'without tradespeople', 'tool-free', 'tool free', 'no builders']
      }
    ]
  },
  {
    id: 'C',
    label: 'Independently lab-tested, certified acoustic performance',
    description: 'The credibility proof point: verified by third-party testing, not just brand claims.',
    hints: ['test report', 'audit', 'register', 'accredited', 'certificate', 'verified', 'documentation'],
    phrases: [
      'independently lab-tested', 'independently tested', 'independent lab testing', 'independently certified',
      'certified acoustic performance', 'third-party tested', 'third-party certified', 'lab-tested', 'lab tested'
    ],
    groups: [
      {
        anchors: ['independent', 'third-party', 'accredited', 'laboratory'],
        benefits: ['certif', 'tested', 'testing', 'verified', 'rating', 'standard']
      }
    ]
  }
]
