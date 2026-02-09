# Contributing to FullCourtVision

Thank you for your interest in contributing to FullCourtVision! This document provides guidelines for contributing to this Victorian basketball analytics platform.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Python 3.8+ (for data analysis components)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/LittleBennos/FullCourtVision.git
   cd FullCourtVision
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies (for scraping and data processing)
   npm install
   
   # Web application dependencies
   cd web
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cd web
   cp .env.local.example .env.local
   # Add your Supabase URL and anon key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 📋 How to Contribute

### Reporting Bugs

- Use the GitHub Issues tab to report bugs
- Include a clear description of the problem
- Provide steps to reproduce the issue
- Include screenshots if applicable

### Suggesting Features

- Open an issue with a clear feature description
- Explain the use case and benefits
- Consider the scope and feasibility

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Run web application tests
   cd web
   npm run test
   npm run test:e2e
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**

## 🧪 Testing

The project uses comprehensive testing with **365 tests** across **5 browser targets**:

- **E2E Tests**: Playwright (Chrome, Firefox, Safari, Mobile)
- **Unit Tests**: Vitest
- **API Tests**: Endpoint validation

Run tests locally:
```bash
cd web
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:e2e:ui   # Interactive test runner
```

## 📊 Data Components

### Scraping Pipeline

- **Location**: `/scraper/` directory
- **Purpose**: Collect data from PlayHQ GraphQL API
- **Key Files**:
  - `playhq-scraper.js` - Core scraper logic
  - `victoria-wide-scrape.js` - Full state data collection
  - `export_for_web.py` - Data export to Supabase

### Analysis Components

- **Location**: `/analysis/` directory  
- **Purpose**: Statistical analysis and ML models
- **Technologies**: Python, scikit-learn, Streamlit

## 🎯 Code Style

### TypeScript/JavaScript
- Use TypeScript for new code
- Follow existing ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for complex functions

### Python
- Follow PEP 8 style guidelines
- Use type hints where possible
- Document functions and classes

## 📁 Project Structure

```
FullCourtVision/
├── web/                    # Next.js 16 web application
├── scraper/                # PlayHQ data scrapers
├── analysis/               # Python statistical analysis
├── data/                   # Local data files
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and contribute
- Focus on constructive feedback
- Follow the Code of Conduct

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

- Open a GitHub Discussion for general questions
- Use Issues for specific bugs or feature requests
- Check existing documentation in `/docs/`

---

Thank you for helping make FullCourtVision better! 🏀