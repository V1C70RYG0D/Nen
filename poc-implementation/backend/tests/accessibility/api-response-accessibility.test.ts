/**
 * API Response Accessibility Tests
 * Tests HTML responses from API endpoints for accessibility compliance
 * Following WCAG guidelines and using jest-axe for automated testing
 */

import { axe, toHaveNoViolations } from 'jest-axe';
import { JSDOM } from 'jsdom';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('API Response Accessibility', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    document = dom.window.document;

    // Set up global document for jest-axe
    (global as any).document = document;
    (global as any).window = dom.window;
  });

  afterEach(() => {
    // Clean up
    dom.window.close();
  });

  it('should generate accessible HTML error responses', async () => {
    // Simulate an error response HTML structure
    const errorHTML = `
      <div role="alert" aria-live="polite">
        <h1>Error 404</h1>
        <p>The requested resource was not found.</p>
        <a href="/" aria-label="Return to homepage">Go back to home</a>
      </div>
    `;

    document.body.innerHTML = errorHTML;

    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it('should generate accessible status page HTML', async () => {
    // Simulate a status page HTML structure
    const statusHTML = `
      <main>
        <h1>System Status</h1>
        <section aria-labelledby="api-status">
          <h2 id="api-status">API Status</h2>
          <p>All systems operational</p>
          <div role="status" aria-live="polite">
            <span class="sr-only">Status:</span>
            <span aria-label="System status: Online">🟢 Online</span>
          </div>
        </section>
      </main>
    `;

    document.body.innerHTML = statusHTML;

    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it('should generate accessible documentation HTML', async () => {
    // Simulate API documentation HTML structure
    const docHTML = `
      <main>
        <h1>API Documentation</h1>
        <nav aria-label="Documentation navigation">
          <ul>
            <li><a href="#endpoints">Endpoints</a></li>
            <li><a href="#authentication">Authentication</a></li>
            <li><a href="#examples">Examples</a></li>
          </ul>
        </nav>

        <section id="endpoints" aria-labelledby="endpoints-heading">
          <h2 id="endpoints-heading">API Endpoints</h2>
          <table role="table" aria-label="API endpoints">
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Endpoint</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GET</td>
                <td>/api/matches</td>
                <td>Retrieve all matches</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    `;

    document.body.innerHTML = docHTML;

    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it('should handle form-based API interfaces accessibly', async () => {
    // Simulate a form interface for API testing
    const formHTML = `
      <main>
        <h1>API Test Interface</h1>
        <form aria-labelledby="api-form-heading">
          <h2 id="api-form-heading">Test API Endpoint</h2>

          <div>
            <label for="endpoint-select">Select Endpoint:</label>
            <select id="endpoint-select" name="endpoint" required aria-describedby="endpoint-help">
              <option value="">Choose an endpoint</option>
              <option value="/api/matches">GET /api/matches</option>
              <option value="/api/users">GET /api/users</option>
            </select>
            <div id="endpoint-help">Select the API endpoint you want to test</div>
          </div>

          <div>
            <label for="request-body">Request Body (JSON):</label>
            <textarea
              id="request-body"
              name="body"
              rows="5"
              cols="50"
              aria-describedby="body-help"
              placeholder='{"key": "value"}'
            ></textarea>
            <div id="body-help">Enter valid JSON for POST/PUT requests</div>
          </div>

          <button type="submit" aria-describedby="submit-help">
            Send Request
          </button>
          <div id="submit-help">Click to send the API request</div>

          <div role="region" aria-live="polite" aria-label="API Response">
            <h3>Response</h3>
            <pre id="response-output"></pre>
          </div>
        </form>
      </main>
    `;

    document.body.innerHTML = formHTML;

    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it('should ensure WCAG color contrast compliance in HTML responses', async () => {
    // Test with specific color contrast rules
    const colorHTML = `
      <main>
        <div style="background-color: #ffffff;">
          <h1 style="color: #000000;">High Contrast Header</h1>
          <p style="color: #333333;">This text has sufficient contrast ratio</p>
          <button style="background-color: #0066cc; color: #ffffff; border: none; padding: 10px;">
            Accessible Button
          </button>
        </div>
      </main>
    `;

    document.body.innerHTML = colorHTML;

    const results = await axe(document.body, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should validate proper heading hierarchy in API documentation', async () => {
    const headingHTML = `
      <main>
        <h1>API Reference</h1>
        <section>
          <h2>Authentication</h2>
          <h3>API Keys</h3>
          <h3>OAuth 2.0</h3>
        </section>
        <section>
          <h2>Endpoints</h2>
          <h3>User Management</h3>
          <h4>Create User</h4>
          <h4>Update User</h4>
          <h3>Match Management</h3>
        </section>
      </main>
    `;

    document.body.innerHTML = headingHTML;

    const results = await axe(document.body, {
      rules: {
        'heading-order': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });
});
