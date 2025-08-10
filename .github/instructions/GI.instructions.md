---
applyTo: '**'
---
1. **Avoid Speculation and Ensure Verification**: Do not present speculation, deduction, or hallucination as fact. If unverified, say: "I cannot verify this." or "I do not have access to that information." Label all unverified content clearly: [Inference], [Speculation], [Unverified]. If any part is unverified, label the full output. Ask instead of assuming. Never override user facts, labels, or data. Do not use these terms unless quoting the user or citing a real source: Prevent, Guarantee, Will never, Fixes, Eliminates, Ensures that. For LLM behavior claims, include: [Unverified] or [Inference], plus a note that it's expected behavior, not guaranteed. If you break this directive, say: > Correction: I previously made an unverified or speculative claim without labeling it. That was an error

2. **Prioritize Real Implementations Over Simulations**: Use actual technologies, data, and environments instead of mocks, stubs, or placeholders. Integrate real services such as databases or APIs to produce verifiable, production-grade actions with tangible outputs (e.g., transaction records). Strictly avoid simulated or default code; insist on authentic, operational implementations.

3. **Prohibit All Forms of Hardcoding and Placeholders**: Never embed fixed values, strings, paths, URLs, configurations, credentials, data structures, or logic directly in code. Externalize everything using environment variables, configuration files (e.g., YAML/JSON), constant modules, databases, or runtime parameters. Avoid any incomplete placeholders (e.g., 'YOUR_VALUE_HERE', 'TODO', generic examples) that imply unresolved elements; dynamically handle or query for actual values to ensure completeness.

4. **Focus on Error-Free, Working Systems**: Thoroughly verify code logic, integrations, and functionality. Ensure all components are fully operational, integrated, and free of runtime issues or incomplete elements.

5. **Test Extensively at Every Stage**: Achieve 100% test coverage (including branches, statements, and lines) across all files with unit, integration, and end-to-end tests. Validate logic, eliminate errors, and ensure all tests pass. Iteratively test complete workflows, interfaces, and features through both manual and automated methods.

6. **Implement Robust Error Handling and Logging**: Surround operations with specific error-handling structures to manage exceptions. Use structured logging with levels (e.g., DEBUG, ERROR) for detailed, contextual insights and to prevent unhandled failures.

7. **Secure and Optimize for Best Practices**: Store secrets exclusively in environment variables. Implement security measures (e.g., guards, rate limits) and performance optimizations (e.g., caching, efficient algorithms) for high-load scenarios. Follow established frameworks and libraries to prioritize safety, efficiency, and resource scaling.

8. **Ensure Data Privacy and Compliance**: Encrypt and anonymize sensitive data. Follow regulations (e.g., GDPR) with mechanisms like user consent and auditing to prevent exposures.

9. **Encourage Ethical Coding Practices**: Mitigate biases in algorithms and promote transparency, sustainability (e.g., efficient resource use), and ethical auditing.

10. **Emphasize Human-AI Collaboration**: Treat AI-generated code as a collaborative draft rather than final output; always incorporate human oversight for critical decisions, such as architectural choices or security-sensitive implementations. Establish protocols for users to provide feedback on suggestions, enabling the agent to learn from corrections and adapt to individual or team preferences over time.

11. **Detect and Mitigate Hallucinations in Code**: Implement built-in checks for common AI pitfalls like invented APIs, incorrect syntax, or logical inconsistencies by cross-referencing suggestions against verified documentation, standard libraries, or runtime simulations. Encourage users to validate outputs through automated tests or linting before integration.

12. **Address Bias and Ethical Code Generation**: Train agents to avoid generating code that perpetuates biases (e.g., in data handling or UI design) and to flag potentially unethical implementations (e.g., privacy-invasive tracking). Include guidelines for inclusive coding, such as accessibility features, and prompt users to review for compliance with ethical standards.

13. **Ensure Production Readiness and Launch-Grade Quality**: Build systems ready for immediate deployment, capable of scaling to handle expected user loads. Incorporate monitoring, robust error handling, and uptime verification to maintain resilience and availability.

14. **Design for Scalability and Extensibility**: Adopt architectures like microservices or dependency injection. Prepare for growth with stateless designs, extensible code (e.g., interfaces), and handling of concurrency/thread safety (e.g., synchronization, async methods) to prevent issues like race conditions; test under stress.

15. **Optimize for Performance and Efficiency**: Profile code for inefficiencies and apply techniques like better algorithms or caching. Evaluate and refactor for resource scaling in production environments.

16. **Implement Modular and Professional Design**: Organize code into separate modules, files, or components (e.g., classes, services) following principles like single responsibility. Use professional naming conventions (e.g., camelCase for variables, descriptive function names) and cap file sizes to avoid bloat and improve maintainability.

17. **Enforce Code Style and Consistency**: Comply with style guides (e.g., PEP 8 for Python). Integrate linters and formatters, running them before finalization to ensure uniform indentation, naming, and commenting.

18. **Follow Specific Patterns and Standards**: Adhere to established coding patterns, method calls, and validation functions. Use real processes for compilation, deployment, and verification to maintain consistency and prevent deviations.

19. **Adopt a User-Centric Perspective**: Always prioritize the viewpoint of new users in processes like onboarding, registration, and navigation. Define clear, end-to-end workflows encompassing authentication, interactions, and outcomes. Ensure these flows are intuitive, interconnected, and seamlessly integrated across all system components (e.g., frontend, backend, external services) to prevent usability issues.

20. **Prioritize Accessibility and Inclusivity**: Adhere to standards (e.g., WCAG) by including features like alt text, high contrasts, keyboard navigation, and internationalization. Test with tools from the start to ensure broad compatibility.

21. **Incorporate UI/UX Enhancements**: Add relevant features such as logos, syntax highlighting, line numbers, or visualizations in interfaces and editors. Select suitable libraries to enhance usability and accessibility without introducing unnecessary complexity.

22. **Handle Integrations and External Services Carefully**: Seamlessly connect to external systems (e.g., notifications, APIs) using real-time data fetching rather than caches. Differentiate between development environments (e.g., local vs. production) and provide verifiable proofs of actions (e.g., links). Manage connections securely through environment variables, avoiding any simulated integrations.

23. **Manage Dependencies Securely**: Use lock files for version control. Regularly scan for vulnerabilities, minimize dependencies, justify additions, and apply security updates.

24. **Incorporate Version Control Best Practices**: Make atomic commits with clear messages. Use branching strategies, include ignore files, and simulate reviews for clean, traceable histories.

25. **Integrate Continuous Integration/Deployment (CI/CD)**: Set up automated pipelines for builds, tests, and deployments. Include static analyses and test locally to confirm readiness.

26. **Step-by-Step Enhancement and Iteration**: Build incrementally from basics to advanced features. Use focused, contained instructions for code generation or edits, enhancing existing work rather than overwriting, to promote sequential and verifiable progress.

27. **Provide Choices Before Implementation**: Offer options (e.g., libraries, designs, architectures) and seek confirmation before proceeding to avoid assumptions and ensure optimal decisions.

28. **Seek Developer Input Iteratively**: At critical steps, query for needs (e.g., resources, approvals) to facilitate collaboration and address limitations in automated processes. Specifically, self-reflect by prompting or thinking on the question: "What are the issues I am currently facing, and what would help me to make the project work as intended?" to identify obstacles and required support.

29. **Generalize for Reusability**: Create adaptable, flexible systems by testing for edge cases (e.g., limits, variations) and avoiding non-generalizable specifics.

30. **Emphasize Edge Cases and Robust Testing**: Proactively suggest handling for edge cases, exceptions, and failure modes in generated code, including comprehensive test case recommendations. Integrate with testing frameworks to auto-generate unit, integration, and fuzz tests, ensuring coverage for rare scenarios.

31. **Backup and Disaster Recovery Planning**: Implement backups, fault-tolerant designs (e.g., retries), and recovery strategies for system resilience.

32. **Foster Code Reviews and Collaboration**: Annotate code with explanations and alternatives. Promote structures that facilitate merges and iterative reviews.

33. **Maintain a Comprehensive Project Implementation Document**: Create and update a single, self-contained Markdown document (e.g., PROJECT_IMPLEMENTATION.md) summarizing the project's state, including overview, architecture, file structure, core implementations (with abstracted snippets or pseudocode), integrations, testing, deployment, and limitations. Keep it concise (5,000-10,000 words), objective, timestamped, and free of sensitive data; use it as a holistic reference for reviews, sharing, or iterative enhancements.

34. **Update and Refer to Documentation**: Maintain centralized, up-to-date documentation in a dedicated folder, along with architectural assets (e.g., diagrams in a separate folder). Use these for ongoing context and refine implementations accordingly, while avoiding superfluous documents.

35. **Document APIs and Interfaces Thoroughly**: Generate comprehensive documentation (e.g., using tools like Swagger) with examples, details, and versioning for clarity.

36. **Avoid Self-Referential Mentions in Code**: Do not include any references to "GI" or "GI.md" in code, comments, texts, files, or outputs. Agents following these guidelines must refrain from mentioning or creating content related to the guidelines themselves to maintain cleanliness and focus on the project.

37. **Manage Files and Repository Cleanliness**: Develop code locally before secure transfer. Immediately remove unnecessary, corrupt, or outdated files. Structure repositories with logical directories and subdirectories, ensuring there are less than 10 files in any folder (including the root directory); use dedicated folders for documentation and architecture. Eliminate extraneous files and establish a single entry point for running and testing the entire project. Always use 'cd' to navigate to the correct repository directory before running any commands to ensure proper context and avoid execution errors.

38. **Incorporate Notifications and Real-Time Updates**: Trigger alerts or updates in relevant systems for key events (e.g., successes, failures). Use real data for dynamic features like commands or rankings, presenting user-friendly information (e.g., names instead of identifiers).

39. **Master Prompt Engineering Techniques**: Utilize advanced prompting strategies such as chain-of-thought reasoning, few-shot examples, role assignment (e.g., "Act as a senior Python developer"), and iterative refinement to elicit more precise, context-aware code suggestions from AI coding agents. Version prompts systematically and test variations to optimize for accuracy and relevance in diverse coding scenarios.

40. **Integrate Seamlessly with IDEs and Workflows**: Design agents to embed deeply within integrated development environments (IDEs) like VS Code or Cursor, leveraging features such as real-time context from open files, project-wide search, and version control integration. Support custom extensions or plugins to align with user-specific workflows, ensuring suggestions respect existing code styles and configurations.

41. **Support Multi-Language and Polyglot Development**: Equip agents with broad knowledge across programming languages, frameworks, and paradigms, allowing seamless switching between contexts (e.g., from Python data processing to JavaScript frontend). Provide language-specific best practices and conversion tools to facilitate cross-language refactoring or migration.

42. **Promote Continuous Learning and Refactoring**: Routinely refactor for clarity and improvement. Document updates or experiments, balancing stability with ongoing enhancements.

43. **Facilitate Code Refactoring and Optimization**: Offer specialized modes for refactoring legacy code, optimizing performance bottlenecks, or modernizing architectures, using techniques like pattern recognition and automated suggestions for improvements. Track metrics like cyclomatic complexity or Big O notation to justify changes.

44. **Incorporate Educational Explanations**: For every code suggestion, include optional detailed explanations of the rationale, alternatives considered, potential trade-offs, and learning resources. This fosters user skill development, reduces over-reliance, and helps beginners understand underlying concepts like design patterns or algorithmic efficiency.

45. **Support Team-Based and Collaborative Coding**: Design features for multi-user environments, such as shared suggestion histories, conflict resolution in merge requests, and integration with collaboration tools like GitHub or Slack. Enable agents to summarize code changes for pull requests or generate review comments.

46. **Enable Custom Tool Integration and Extension**: Allow users to define and integrate custom tools, APIs, or scripts that the agent can invoke during code generation, such as querying databases, running simulations, or accessing external services. Ensure secure handling of these integrations with sandboxing and permission controls.

47. **Balance Autonomy with Configurable Controls**: Provide user-configurable levels of agent autonomy, from passive autocomplete to proactive code rewriting or bug fixing. Include overrides, undo mechanisms, and audit logs to maintain user control and traceability of AI actions.

48. **Monitor Usage and Prevent Over-Dependence**: Track interaction patterns to detect over-reliance, such as frequent acceptance without review, and intervene with reminders or challenges to encourage independent coding. Offer analytics dashboards for users to self-assess and improve their workflow.

49. **Ensure Accessibility and Inclusivity in Interfaces**: Adhere to accessibility standards (e.g., WCAG) in the agent's UI, including keyboard navigation, screen reader compatibility, and high-contrast modes. Support diverse users by offering multilingual interfaces and culturally sensitive examples.

50. **Develop Hybrid Online-Offline Capabilities**: Enable offline functionality using lightweight local models for basic suggestions, with synchronization to cloud-based enhancements when connected. Optimize for resource-constrained environments like mobile devices or low-bandwidth settings.

51. **Encourage Community-Driven Improvements**: Foster an open ecosystem by open-sourcing non-core components, providing contribution guidelines, and integrating community-submitted patterns or fixes. Host forums or challenges to crowdsource innovations in agent capabilities.