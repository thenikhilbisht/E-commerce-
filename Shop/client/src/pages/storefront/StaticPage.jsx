import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pagesAPI } from '../../services/api';
import StorefrontLayout from '../../components/StorefrontLayout';

export default function StaticPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    pagesAPI.get(slug)
      .then(res => {
        setPage(res.data.page);
        document.title = `${res.data.page.title} — ShopIndia`;
      })
      .catch(() => {
        navigate('/');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug, navigate]);

  if (loading) {
    return (
      <StorefrontLayout>
        <div className="container loading-container">
          <div className="spinner lg"></div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!page) return null;

  return (
    <StorefrontLayout>
      <article className="container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-16)', maxWidth: '800px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>{page.title}</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-8)' }}>
          Last updated: {new Date(page.updated_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
        </p>
        <div 
          className="tiptap-editor-wrap"
          style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text-2)' }}
        >
          {/* ProseMirror class ensures list bullets, margins, and headings match our design tokens */}
          <div 
            className="ProseMirror" 
            style={{ border: 'none', padding: 0, minHeight: 'auto' }}
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        </div>
      </article>
    </StorefrontLayout>
  );
}
