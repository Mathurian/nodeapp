import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface FAQItem {
  question: string
  answer: string
  category: string
}

interface DocSection {
  title: string
  icon: React.ComponentType<any>
  description: string
  docs: DocLink[]
}

interface DocLink {
  title: string
  description: string
  path: string
}

const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'faq' | 'docs'>('faq')
  const [expandedFAQs, setExpandedFAQs] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewingDoc, setViewingDoc] = useState<{ title: string; content: string } | null>(null)

  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      question: 'How do I create my first event?',
      answer: 'Navigate to the Events page from the sidebar or command palette (Cmd/Ctrl+K), then click "Create Event". Fill in the event details including name, date, and location. After creating the event, you can add contests and categories to it.'
    },
    {
      category: 'Getting Started',
      question: 'What are the different user roles?',
      answer: 'The system has several roles: ADMIN (full system access), ORGANIZER (event management), JUDGE (scoring), TALLY_MASTER (score verification), AUDITOR (final certification), BOARD (approvals), and CONTESTANT (participation). Each role has specific permissions and access levels.'
    },
    {
      category: 'Getting Started',
      question: 'How do I navigate the system quickly?',
      answer: 'Use the Command Palette (Cmd/Ctrl+K) to quickly access any page, create items, or perform actions. You can also use keyboard shortcuts like F1 for help, Cmd/Ctrl+B for sidebar, and "/" for search.'
    },
    {
      category: 'Scoring',
      question: 'How does the scoring workflow work?',
      answer: 'Judges submit scores for contestants in assigned categories. Tally Masters verify and certify the totals. Auditors perform final certification, and Board members approve the results. This multi-step verification ensures accuracy.'
    },
    {
      category: 'Scoring',
      question: 'Can I apply deductions to scores?',
      answer: 'Yes, judges can apply deductions when scoring. Navigate to the scoring page, select a contestant, and use the deductions panel to add time penalties, point deductions, or other adjustments. All deductions are logged for transparency.'
    },
    {
      category: 'Scoring',
      question: 'How do I fix a score after submission?',
      answer: 'Scores can be edited before certification. If a score is already certified, an admin or the certifying user must first decertify it, then the judge can edit and resubmit the score.'
    },
    {
      category: 'Results',
      question: 'How are winners determined?',
      answer: 'Winners are determined by the highest total scores after all judges have submitted scores, deductions are applied, and the results are certified through the tally master and auditor workflow. Ties are handled according to the contest rules.'
    },
    {
      category: 'Results',
      question: 'Can contestants see their scores?',
      answer: 'This depends on the contestant visibility settings configured by administrators. By default, contestants may see final results after certification, but individual judge scores may be hidden. Check Settings → Contestant Visibility to configure this.'
    },
    {
      category: 'Results',
      question: 'How do I generate reports?',
      answer: 'Navigate to the Reports page to generate various reports including score sheets, results summaries, judge assignments, and more. You can export reports as PDF or Excel files.'
    },
    {
      category: 'Administration',
      question: 'How do I configure email notifications?',
      answer: 'Go to Settings → Email/SMTP Settings. Configure your SMTP server details including host, port, username, and password. You can test the configuration before saving. Email notifications will be sent for important events like score certifications.'
    },
    {
      category: 'Administration',
      question: 'How do I backup my data?',
      answer: 'Navigate to Backups from the sidebar or command palette. You can create manual backups or configure automatic scheduled backups. Backups include the database, uploaded files, and configuration. Store backups securely off-site.'
    },
    {
      category: 'Administration',
      question: 'How do I customize the application theme?',
      answer: 'Go to Settings → Theme & Branding. You can customize the application name, subtitle, primary and secondary colors, upload a custom logo and favicon. Changes apply system-wide immediately.'
    },
    {
      category: 'Administration',
      question: 'What security settings are available?',
      answer: 'Navigate to Settings → Security Settings to configure max login attempts, lockout duration, session timeout, password requirements, and two-factor authentication. Strong password policies are recommended for production environments.'
    },
    {
      category: 'Troubleshooting',
      question: 'Why am I getting permission denied errors?',
      answer: 'Permission errors occur when your user role lacks the required permissions for an action. Contact your system administrator to request appropriate role assignments or permissions.'
    },
    {
      category: 'Troubleshooting',
      question: 'What if scores are not calculating correctly?',
      answer: 'Ensure all judges have submitted scores for all contestants in the category. Verify that deductions are applied correctly. Check the category type and scoring method. If issues persist, check the logs in Admin → Logs for detailed error messages.'
    },
    {
      category: 'Troubleshooting',
      question: 'How do I recover from accidental data deletion?',
      answer: 'If you have automatic backups enabled, restore from the most recent backup via the Disaster Recovery page. Always maintain regular backups. Some deletions may be recoverable from the Archive if soft-delete is enabled.'
    },
    {
      category: 'Advanced Features',
      question: 'What are workflow customizations?',
      answer: 'Workflow customizations allow you to modify the certification workflow, approval processes, and automation rules. Navigate to Workflows to configure custom approval chains, notifications, and business logic.'
    },
    {
      category: 'Advanced Features',
      question: 'How do I use bulk operations?',
      answer: 'The Bulk Operations page allows you to perform actions on multiple items simultaneously, such as assigning judges to multiple categories, updating contestant information in batch, or generating multiple reports at once.'
    },
    {
      category: 'Advanced Features',
      question: 'Can I integrate with external systems?',
      answer: 'Yes, the system provides a RESTful API for external integrations. API documentation is available at /api/docs. You can generate API keys in your Profile settings for authentication.'
    },
    {
      category: 'Advanced Features',
      question: 'How do I set up multi-tenancy?',
      answer: 'Multi-tenancy allows multiple organizations to use separate instances within the same deployment. Navigate to Tenants (admin only) to create and manage tenant organizations. Each tenant has isolated data and settings.'
    },
  ]

  const docSections: DocSection[] = [
    {
      title: 'Architecture & Getting Started',
      icon: RocketLaunchIcon,
      description: 'Learn about the system architecture and get started quickly',
      docs: [
        {
          title: 'System Architecture',
          description: 'Overview of the application architecture, components, and data flow',
          path: '/docs/01-ARCHITECTURE.md'
        },
        {
          title: 'Getting Started Guide',
          description: 'Quick start guide for new users and administrators',
          path: '/docs/02-GETTING-STARTED.md'
        },
        {
          title: 'Features Overview',
          description: 'Comprehensive overview of all system features and capabilities',
          path: '/docs/03-FEATURES.md'
        },
      ]
    },
    {
      title: 'Technical Reference',
      icon: CodeBracketIcon,
      description: 'API documentation and technical specifications',
      docs: [
        {
          title: 'API Reference',
          description: 'Complete API endpoint documentation and examples',
          path: '/docs/04-API-REFERENCE.md'
        },
        {
          title: 'Database Schema',
          description: 'Database structure, relationships, and data models',
          path: '/docs/05-DATABASE.md'
        },
        {
          title: 'Frontend Guide',
          description: 'Frontend architecture, components, and development guide',
          path: '/docs/06-FRONTEND.md'
        },
      ]
    },
    {
      title: 'Security & Deployment',
      icon: ShieldCheckIcon,
      description: 'Security best practices and deployment instructions',
      docs: [
        {
          title: 'Security Guide',
          description: 'Security features, best practices, and hardening guide',
          path: '/docs/07-SECURITY.md'
        },
        {
          title: 'Deployment Guide',
          description: 'Production deployment instructions and configuration',
          path: '/docs/08-DEPLOYMENT.md'
        },
        {
          title: 'Development Setup',
          description: 'Local development environment setup and workflow',
          path: '/docs/09-DEVELOPMENT.md'
        },
      ]
    },
    {
      title: 'Operations & Maintenance',
      icon: WrenchScrewdriverIcon,
      description: 'Operational guides and maintenance procedures',
      docs: [
        {
          title: 'Troubleshooting Guide',
          description: 'Common issues, solutions, and debugging techniques',
          path: '/docs/10-TROUBLESHOOTING.md'
        },
        {
          title: 'Disaster Recovery',
          description: 'Backup, restore, and disaster recovery procedures',
          path: '/docs/11-DISASTER-RECOVERY.md'
        },
        {
          title: 'Workflow Customization',
          description: 'Customizing workflows, approvals, and business logic',
          path: '/docs/12-WORKFLOW-CUSTOMIZATION.md'
        },
      ]
    },
  ]

  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))]

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleFAQ = (question: string) => {
    if (expandedFAQs.includes(question)) {
      setExpandedFAQs(expandedFAQs.filter(q => q !== question))
    } else {
      setExpandedFAQs([...expandedFAQs, question])
    }
  }

  const handleDocClick = async (doc: DocLink) => {
    // For now, show example documentation content
    // In production, this would fetch from the server or load from public folder
    const exampleContent = `# ${doc.title}

## Overview

${doc.description}

## Getting Started

This section provides detailed information about ${doc.title.toLowerCase()}.

### Prerequisites

- Access to the Event Manager system
- Appropriate user role and permissions
- Understanding of basic event management concepts

### Key Features

1. **Feature One**: Description of the first key feature
2. **Feature Two**: Description of the second key feature
3. **Feature Three**: Description of the third key feature

## Usage

To use this feature:

\`\`\`javascript
// Example code snippet
const example = {
  feature: "demo",
  status: "active"
};
\`\`\`

## Best Practices

- Always follow system guidelines
- Test changes in a development environment first
- Keep documentation up to date
- Communicate with team members

## Common Issues

**Issue**: Something isn't working as expected

**Solution**: Check the following:
- Verify permissions
- Check system logs
- Contact administrator if issue persists

## Additional Resources

- [Main Documentation](/)
- [FAQ Section](#faq)
- [Support Contact](mailto:support@example.com)

---

*Note: This is example documentation content. In production, actual markdown files would be loaded from the server or documentation repository.*
`
    setViewingDoc({ title: doc.title, content: exampleContent })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <QuestionMarkCircleIcon className="h-10 w-10 mr-3 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Documentation</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Find answers to common questions and explore comprehensive documentation
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles and documentation..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('faq')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'faq'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <QuestionMarkCircleIcon className="h-5 w-5 mr-2" />
                Frequently Asked Questions
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'docs'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Documentation
              </button>
            </nav>
          </div>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div>
            {/* Category Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {category === 'all' ? 'All Categories' : category}
                </button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {filteredFAQs.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                  <QuestionMarkCircleIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No FAQs found matching your search.</p>
                </div>
              ) : (
                filteredFAQs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.question)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-start">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 mr-3">
                            {faq.category}
                          </span>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white flex-1">
                            {faq.question}
                          </h3>
                        </div>
                      </div>
                      {expandedFAQs.includes(faq.question) ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQs.includes(faq.question) && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Help Footer */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start">
                <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Still need help?
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    If you can't find the answer you're looking for, check out our comprehensive documentation or contact your system administrator.
                  </p>
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center"
                  >
                    Browse Documentation
                    <ChevronDownIcon className="h-4 w-4 ml-1 rotate-[-90deg]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            {docSections.map((section, index) => {
              const Icon = section.icon
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {section.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {section.docs.map((doc, docIndex) => (
                      <button
                        key={docIndex}
                        onClick={() => handleDocClick(doc)}
                        className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
                      >
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {doc.title}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {doc.description}
                          </p>
                        </div>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 ml-2 flex-shrink-0 rotate-[-90deg]" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-3">
              <BookOpenIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white">User Guide</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Learn how to use the system effectively with our comprehensive user guide.
            </p>
            <button
              onClick={() => {
                setActiveTab('docs')
                handleDocClick({ title: 'Getting Started', description: 'Learn how to use the system effectively', path: '/docs/02-GETTING-STARTED.md' })
              }}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
            >
              Read Guide →
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-3">
              <CodeBracketIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white">API Reference</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Integrate with external systems using our RESTful API.
            </p>
            <button
              onClick={() => {
                setActiveTab('docs')
                handleDocClick({ title: 'API Reference', description: 'RESTful API integration documentation', path: '/docs/04-API-REFERENCE.md' })
              }}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              View API Docs →
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-3">
              <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-2" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Troubleshooting</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Find solutions to common problems and error messages.
            </p>
            <button
              onClick={() => {
                setActiveTab('docs')
              }}
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
            >
              Get Help →
            </button>
          </div>
        </div>

        {/* Documentation Viewer Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                  {viewingDoc.title}
                </h2>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-6 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="ml-4" {...props} />,
                      code: ({node, className, children, ...props}: any) => {
                        const isInline = !className?.includes('language-')
                        return isInline
                          ? <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded text-blue-600 dark:text-blue-400" {...props}>{children}</code>
                          : <code className="block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm overflow-x-auto mb-4" {...props}>{children}</code>
                      },
                      pre: ({node, ...props}) => <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 mb-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />,
                    }}
                  >
                    {viewingDoc.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setViewingDoc(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HelpPage
