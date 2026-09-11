import { useState } from 'react'
import type {
  AustralianStudyEntry,
  EducationEntry,
  EmploymentEntry,
  EnglishTestScore,
  ImmigrationHistoryEntry
} from '@shared/ipc-types'
import { PersonalProfileSection } from '../components/information/PersonalProfileSection'
import { SponsorsSection } from '../components/information/SponsorsSection'
import { RepeatableEntitySection } from '../components/information/RepeatableEntitySection'

const SUB_SECTIONS = [
  'personal',
  'education',
  'englishTest',
  'australianStudy',
  'employment',
  'immigration',
  'financial'
] as const
type SubSection = (typeof SUB_SECTIONS)[number]

const SUB_LABEL: Record<SubSection, string> = {
  personal: 'Personal',
  education: 'Education',
  englishTest: 'English Test',
  australianStudy: 'Australian Study',
  employment: 'Employment',
  immigration: 'Immigration History',
  financial: 'Financial / Sponsor'
}

export function InformationStage({ clientId }: { clientId: string }): React.JSX.Element {
  const [active, setActive] = useState<SubSection>('personal')

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap gap-1 border-b border-[var(--md-outline-variant)] pb-2">
        {SUB_SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={`app-no-drag rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              active === s
                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                : 'text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]'
            }`}
          >
            {SUB_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="max-w-3xl flex-1 overflow-y-auto pb-8">
        {active === 'personal' && <PersonalProfileSection clientId={clientId} />}

        {active === 'education' && (
          <RepeatableEntitySection<EducationEntry>
            title="Education"
            description="Primary, secondary, and post-secondary education history."
            parentId={clientId}
            hasVerification
            titleField="institution"
            subtitleField="course"
            emptyLabel="No education entries added yet"
            addLabel="+ Add education entry"
            fields={[
              {
                key: 'level',
                label: 'Level',
                type: 'select',
                options: [
                  { value: 'primary', label: 'Primary' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'post_secondary', label: 'Post-secondary' }
                ]
              },
              { key: 'institution', label: 'Institution', type: 'text' },
              { key: 'course', label: 'Course', type: 'text' },
              { key: 'startDate', label: 'Start date', type: 'date' },
              { key: 'endDate', label: 'End date', type: 'date' },
              { key: 'qualification', label: 'Qualification', type: 'text' },
              { key: 'finalGrade', label: 'Final grade / result', type: 'text' },
              {
                key: 'institutionContact',
                label: 'Institution contact / referee',
                type: 'text',
                fullWidth: true
              },
              {
                key: 'clubsCertifications',
                label: 'Clubs, associations, certifications',
                type: 'textarea',
                fullWidth: true
              }
            ]}
            keyValueFields={[
              { key: 'gradeBreakdown', heading: 'Grade breakdown', addLabel: '+ Add subject' }
            ]}
            api={window.api.information.education}
          />
        )}

        {active === 'englishTest' && (
          <RepeatableEntitySection<EnglishTestScore>
            title="English Test (IELTS / etc.)"
            description="Overall and component scores for each test attempt."
            parentId={clientId}
            hasVerification
            titleField="overallScore"
            subtitleField="testDate"
            emptyLabel="No test scores added yet"
            addLabel="+ Add test score"
            fields={[
              { key: 'testDate', label: 'Test date', type: 'date' },
              { key: 'overallScore', label: 'Overall score', type: 'text' },
              { key: 'trfReference', label: 'TRF reference', type: 'text' }
            ]}
            keyValueFields={[
              {
                key: 'componentScores',
                heading: 'Component scores',
                hint: 'Add Listening, Reading, Writing, Speaking, etc.',
                addLabel: '+ Add component'
              }
            ]}
            api={window.api.information.englishTest}
          />
        )}

        {active === 'australianStudy' && (
          <RepeatableEntitySection<AustralianStudyEntry>
            title="Australian Study"
            description="Intended institution, course, and CoE information — repeatable for multiple CoEs."
            parentId={clientId}
            titleField="institutionProvider"
            subtitleField="course"
            emptyLabel="No Australian study entries added yet"
            addLabel="+ Add study entry"
            fields={[
              { key: 'institutionProvider', label: 'Institution / provider', type: 'text' },
              { key: 'course', label: 'Course', type: 'text' },
              { key: 'courseLevel', label: 'Course level', type: 'text' },
              { key: 'coeReference', label: 'CoE reference', type: 'text' },
              { key: 'offerLetterReference', label: 'Offer letter reference', type: 'text' },
              { key: 'intendedStartDate', label: 'Intended start date', type: 'date' }
            ]}
            api={window.api.information.australianStudy}
          />
        )}

        {active === 'employment' && (
          <RepeatableEntitySection<EmploymentEntry>
            title="Employment"
            parentId={clientId}
            hasVerification
            titleField="employer"
            subtitleField="jobTitle"
            emptyLabel="No employment entries added yet"
            addLabel="+ Add employment entry"
            fields={[
              { key: 'employer', label: 'Employer', type: 'text' },
              { key: 'jobTitle', label: 'Job title', type: 'text' },
              { key: 'employmentType', label: 'Employment type', type: 'text' },
              { key: 'startDate', label: 'Start date', type: 'date' },
              { key: 'endDate', label: 'End date', type: 'date' },
              { key: 'monthlySalary', label: 'Monthly salary', type: 'text' },
              { key: 'employerContact', label: 'Employer contact', type: 'text' },
              { key: 'duties', label: 'Duties', type: 'textarea', fullWidth: true }
            ]}
            api={window.api.information.employment}
          />
        )}

        {active === 'immigration' && (
          <RepeatableEntitySection<ImmigrationHistoryEntry>
            title="Immigration / Residence History"
            parentId={clientId}
            titleField="description"
            subtitleField="dateFrom"
            emptyLabel="No immigration history entries added yet"
            addLabel="+ Add entry"
            fields={[
              { key: 'description', label: 'Description', type: 'textarea', fullWidth: true },
              { key: 'dateFrom', label: 'Date from', type: 'date' },
              { key: 'dateTo', label: 'Date to', type: 'date' }
            ]}
            api={window.api.information.immigration}
          />
        )}

        {active === 'financial' && <SponsorsSection clientId={clientId} />}
      </div>
    </div>
  )
}
