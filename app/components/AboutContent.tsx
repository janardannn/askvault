/** Shared About content — rendered both in the /about route and the in-app overlay. */
export function AboutContent() {
  return (
    <div className="about-main">
      <header className="about-hero">
        <h1>About askvault</h1>
        <p className="about-tagline">Talk to your second brain.</p>
      </header>

      <section className="about-section">
        <h2>Why</h2>
        <p>
          I (
          <a href="https://github.com/janardannn" target="_blank" rel="noopener noreferrer">
            @janardannn
          </a>
          ) basically live in Obsidian. Work notes, half-baked ideas, things I
          figured out at 2 AM and didn&apos;t want to lose — it all goes in there.
        </p>
        <p>
          The trouble is finding it again. I always <em>remember</em> that I wrote
          something down — some fix, some doc, some idea — I just can&apos;t remember
          where. It&apos;s worst at work: when I&apos;m deep in something I drop a
          pile of notes as I go, and a week later I need the exact file back. I
          don&apos;t want to click through folders trying to recall what I named it.
          I want to ask, in plain words, &ldquo;where did I write about X?&rdquo; and
          get the right notes.
        </p>
        <p>
          That&apos;s all askvault is. You talk to your vault, it finds the notes —
          and it can only ever read them, so there&apos;s no chance of it touching
          anything.
        </p>
      </section>

      <section className="about-section">
        <h2>How it works</h2>
        <p>
          I didn&apos;t want my notes (or my API key) sitting on someone&apos;s
          server, so askvault has no backend at all — it&apos;s just static files
          running in your browser.
        </p>
        <ul className="about-points">
          <li>
            <strong>Bring your own key.</strong> Your OpenRouter key is encrypted in
            the browser with a passphrase and stored locally; it only leaves to call
            the model directly.
          </li>
          <li>
            <strong>Your vault, read-only.</strong> You pick a folder with the
            browser&apos;s file picker; askvault asks for read access only and has no
            way to write, rename, or delete.
          </li>
          <li>
            <strong>Notes reach one place.</strong> Only the snippets the model needs
            leave your machine, sent straight to the model you chose — never to me.
          </li>
          <li>
            <strong>Stays out of your way.</strong> Chats save locally, you can swap
            models mid-conversation, and long histories get trimmed to fit the model
            automatically.
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Tech</h2>
        <div className="about-grid">
          <div><span className="ag-k">Frontend</span><span className="ag-v">Next.js 15, React 19, TypeScript</span></div>
          <div><span className="ag-k">AI</span><span className="ag-v">Vercel AI SDK v6, OpenRouter (BYOK)</span></div>
          <div><span className="ag-k">Vault</span><span className="ag-v">File System Access API (read-only)</span></div>
          <div><span className="ag-k">Crypto &amp; storage</span><span className="ag-v">Web Crypto, localStorage, IndexedDB</span></div>
          <div><span className="ag-k">UI</span><span className="ag-v">Hand-rolled CSS, canvas constellation</span></div>
          <div><span className="ag-k">Hosting</span><span className="ag-v">Fully static — no server</span></div>
        </div>
      </section>

      <section className="about-section">
        <h2>Open source</h2>
        <p>
          It&apos;s open source — poke around the read-only vault layer, the
          encryption, and the in-browser agent on{" "}
          <a href="https://github.com/janardannn" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
      </section>
    </div>
  );
}
