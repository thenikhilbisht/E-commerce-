import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import { pagesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

// TipTap toolbar helper component
function MenuBar({ editor }) {
  if (!editor) return null;

  return (
    <div className="tiptap-toolbar">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''}
        title="Strike"
      >
        <s>S</s>
      </button>
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 4px' }} />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
        title="Heading 3"
      >
        H3
      </button>
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 4px' }} />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        title="Numbered List"
      >
        1. List
      </button>
      <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 4px' }} />
      <button
        type="button"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={editor.isActive('link') ? 'is-active' : ''}
        title="Insert Link"
      >
        🔗
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
        title="Remove Link"
      >
        unlink
      </button>
    </div>
  );
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
      }),
    ],
    content: '',
  });

  useEffect(() => {
    document.title = 'Manage Pages — Admin';
    loadPages();
  }, []);

  const loadPages = () => {
    setLoading(true);
    pagesAPI.list()
      .then(res => {
        setPages(res.data.pages || []);
      })
      .catch(() => {
        toast.error('Failed to load static pages');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSelectPage = (page) => {
    setLoading(true);
    pagesAPI.get(page.slug)
      .then(res => {
        setSelectedPage(res.data.page);
        if (editor) {
          editor.commands.setContent(res.data.page.content || '');
        }
      })
      .catch(() => {
        toast.error('Failed to load page content');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSave = async () => {
    if (!selectedPage || !editor) return;
    setSaving(true);
    const content = editor.getHTML();

    try {
      await pagesAPI.update(selectedPage.slug, {
        title: selectedPage.title,
        content,
        is_published: selectedPage.is_published === 1,
      });
      toast.success('Page saved successfully!');
      loadPages();
    } catch {
      toast.error('Failed to save page changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Storefront Pages</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginTop: '2px' }}>
              Manage policy pages and custom static content slugs
            </p>
          </div>
        </div>

        {loading && !selectedPage ? (
          <div className="loading-container">
            <div className="spinner lg"></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }} className="admin-pages-grid">
            {/* Sidebar list */}
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-body" style={{ padding: 'var(--space-4)' }}>
                <h3 style={{ marginBottom: 'var(--space-3)' }}>Pages</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {pages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPage(p)}
                      className={`admin-nav-link${selectedPage?.slug === p.slug ? ' active' : ''}`}
                      style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
                    >
                      <span>📄</span> {p.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor Area */}
            {selectedPage ? (
              <div className="card">
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <div>
                      <h2>Edit: {selectedPage.title}</h2>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>Slug: /page/{selectedPage.slug}</span>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? '⏳ Saving…' : '💾 Save Changes'}
                    </button>
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label className="form-label required" htmlFor="page-title-input">Page Title</label>
                    <input
                      id="page-title-input"
                      type="text"
                      className="form-input"
                      value={selectedPage.title}
                      onChange={e => setSelectedPage(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Page Content (WYSIWYG)</label>
                    <div className="tiptap-editor-wrap">
                      <MenuBar editor={editor} />
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card flex-center" style={{ padding: 'var(--space-12)' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-3)' }}>
                  <span style={{ fontSize: '3rem' }}>👈</span>
                  <h3 style={{ marginTop: 'var(--space-2)' }}>Select a page from the sidebar to edit</h3>
                </div>
              </div>
            )}
          </div>
        )}
        <style>{`
            @media (min-width: 768px) {
              .admin-pages-grid { grid-template-columns: 240px 1fr !important; }
            }
          `}</style>
        </div>
      </AdminLayout>
    );
}
