import { useState, useEffect } from 'react';
import { productsAPI, categoriesAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    compare_price: '',
    sizes: 'S, M, L, XL, XXL',
    category_id: '',
    stock: '50',
    is_published: true,
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Manage Products — Admin';
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      productsAPI.list({ limit: 100 }),
      categoriesAPI.list(),
    ]).then(([prodRes, catRes]) => {
      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
    }).catch(() => {
      toast.error('Failed to load catalog data');
    }).finally(() => {
      setLoading(false);
    });
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      title: '',
      description: '',
      price: '',
      compare_price: '',
      sizes: 'S, M, L, XL, XXL',
      category_id: categories[0]?.id || '',
      stock: '50',
      is_published: true,
    });
    setImageFiles([]);
    setExistingImages([]);
    setImageUrlInput('');
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setForm({
      title: p.title,
      description: p.description || '',
      price: p.price.toString(),
      compare_price: p.compare_price ? p.compare_price.toString() : '',
      sizes: (p.sizes || []).join(', '),
      category_id: p.category_id || '',
      stock: p.stock.toString(),
      is_published: p.is_published === 1,
    });
    setImageFiles([]);
    setExistingImages(p.images || []);
    setImageUrlInput('');
    setShowModal(true);
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    if (!imageUrlInput.startsWith('http://') && !imageUrlInput.startsWith('https://') && !imageUrlInput.startsWith('/')) {
      return toast.error('Please enter a valid HTTP/HTTPS image URL');
    }
    setExistingImages(prev => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
    toast.success('Image URL added to gallery preview');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
  };

  const removeNewImage = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.price.trim() || isNaN(form.price)) return toast.error('Valid price is required');

    setSaving(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append('compare_price', form.compare_price);
    formData.append('stock', form.stock);
    formData.append('category_id', form.category_id);
    formData.append('is_published', form.is_published);

    const sizesArr = form.sizes
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    formData.append('sizes', JSON.stringify(sizesArr));

    imageFiles.forEach(file => {
      formData.append('images', file);
    });

    formData.append('existing_images', JSON.stringify(existingImages));

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(formData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted successfully');
      loadData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Products</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginTop: '2px' }}>
              Add, edit and manage product images, inventory and specs
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            ➕ Add Product
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner lg"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No products yet</h2>
            <p className="empty-state__text">Get started by creating your first product details.</p>
            <button className="btn btn-primary" onClick={openCreateModal}>Add Product</button>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td data-label="Product">
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=150&q=80'}
                          alt={p.title}
                          style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)' }}
                          loading="lazy"
                        />
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                      </div>
                    </td>
                    <td data-label="Category">{p.category_name || 'Unassigned'}</td>
                    <td data-label="Price" style={{ fontWeight: 600 }}>
                      ₹{p.price.toLocaleString('en-IN')}
                      {p.compare_price && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', textDecoration: 'line-through', marginLeft: '6px' }}>₹{p.compare_price}</span>}
                    </td>
                    <td data-label="Stock" style={{ fontWeight: 500 }}>{p.stock}</td>
                    <td data-label="Status">
                      <span className={`badge ${p.is_published === 1 ? 'badge-delivered' : 'badge-cancelled'}`}>
                        {p.is_published === 1 ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(p)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={() => setShowModal(false)} style={{ fontSize: '1.5rem', padding: '4px', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="prod-title">Product Title</label>
                    <input id="prod-title" type="text" className="form-input" placeholder="e.g. Classic White Cotton Kurta" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} required />
                  </div>

                  <div className="form-row form-row-2">
                    <div className="form-group">
                      <label className="form-label required" htmlFor="prod-price">Price (₹)</label>
                      <input id="prod-price" type="number" className="form-input" placeholder="999" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="prod-compare">Compare Price (₹)</label>
                      <input id="prod-compare" type="number" className="form-input" placeholder="1499" value={form.compare_price} onChange={e => setForm(prev => ({ ...prev, compare_price: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-row form-row-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="prod-category">Category</label>
                      <select id="prod-category" className="form-select" value={form.category_id} onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}>
                        <option value="">Unassigned</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label required" htmlFor="prod-stock">Stock Count</label>
                      <input id="prod-stock" type="number" className="form-input" value={form.stock} onChange={e => setForm(prev => ({ ...prev, stock: e.target.value }))} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-sizes">Sizes (Comma separated)</label>
                    <input id="prod-sizes" type="text" className="form-input" placeholder="S, M, L, XL" value={form.sizes} onChange={e => setForm(prev => ({ ...prev, sizes: e.target.value }))} />
                    <span className="form-hint">Leave blank if this product doesn't have size variants</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-desc">Description (Plain HTML allowed)</label>
                    <textarea id="prod-desc" className="form-textarea" placeholder="Describe the fabrics, washes, fits..." value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={4} />
                  </div>

                  {/* Image URL & File Uploader */}
                  <div className="form-group">
                    <label className="form-label">Product Gallery Images</label>

                    {/* Image URL add row */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                        value={imageUrlInput}
                        onChange={e => setImageUrlInput(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="btn btn-secondary" onClick={handleAddImageUrl}>
                        + Add URL
                      </button>
                    </div>

                    <div className="image-upload-zone" onClick={() => document.getElementById('prod-images-input').click()} style={{ cursor: 'pointer', padding: '16px', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                      📁 Click to Upload Local Image Files
                      <input id="prod-images-input" type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>

                    <div className="image-preview-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {existingImages.map((img, i) => (
                        <div key={`existing-${i}`} className="image-preview-item" style={{ position: 'relative', width: '70px', height: '90px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                          <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" className="image-preview-item__remove" onClick={() => removeExistingImage(i)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                      {imageFiles.map((file, i) => (
                        <div key={`new-${i}`} className="image-preview-item" style={{ position: 'relative', width: '70px', height: '90px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--color-primary)' }}>
                          <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" className="image-preview-item__remove" onClick={() => removeNewImage(i)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <input
                      id="prod-publish"
                      type="checkbox"
                      checked={form.is_published}
                      onChange={e => setForm(prev => ({ ...prev, is_published: e.target.checked }))}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label className="form-label" htmlFor="prod-publish" style={{ cursor: 'pointer', marginBottom: 0 }}>
                      Publish this product (visible on storefront)
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? '⏳ Saving…' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
