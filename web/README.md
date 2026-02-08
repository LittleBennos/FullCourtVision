This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

This project includes comprehensive testing with both unit tests (Vitest) and end-to-end tests (Playwright).

### Unit Tests

Run unit tests with:

```bash
npm run test
```

### End-to-End Tests

The project includes comprehensive E2E tests covering:

- **Page Load Tests** - All routes load without errors
- **API Route Tests** - All API endpoints return correct JSON structure
- **User Flow Tests** - Search, pagination, sorting functionality  
- **Dynamic Routes** - Player, team, organisation detail pages
- **SEO Tests** - Meta tags, Open Graph, JSON-LD structured data
- **Edge Cases** - Error handling, invalid inputs, network failures

#### Running E2E Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests with browser visible (headed mode)
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

#### Test Configuration

Tests run against the production URL (https://fullcourtvision.vercel.app) by default. To test against a different environment, update the `baseURL` in `playwright.config.ts`.

#### Test Structure

- `tests/page-loads.spec.ts` - Page load and basic functionality tests
- `tests/dynamic-routes.spec.ts` - Dynamic route testing with real data
- `tests/api-routes.spec.ts` - API endpoint validation and structure testing
- `tests/user-flows.spec.ts` - User interaction flows (search, pagination, sorting)
- `tests/seo.spec.ts` - SEO, meta tags, and structured data validation
- `tests/edge-cases.spec.ts` - Error handling and edge case scenarios

#### Browser Support

Tests run across multiple browsers:
- Chromium (Desktop Chrome)
- Firefox
- WebKit (Desktop Safari) 
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
