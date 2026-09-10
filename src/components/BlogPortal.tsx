import React, { useState, useEffect } from 'react';
import { BlogPost, BlogComment, User } from '../types';
import { fetchBlogPosts, createBlogPost, likeBlogPost, addBlogComment, likeBlogComment } from '../api';
import { MathJaxView } from './MathJaxView';
import {
  Newspaper,
  Briefcase,
  BookOpen,
  Calendar,
  Eye,
  Heart,
  Search,
  Tag,
  PlusCircle,
  X,
  Loader2,
  Share2,
  Clock,
  ChevronRight,
  Sparkles,
  Award,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Download,
  MessageSquare,
  ThumbsUp,
  Copy,
  Check,
  Volume2,
  ExternalLink,
  ChevronLeft,
  Maximize2
} from 'lucide-react';

interface BlogPortalProps {
  currentUser: User | null;
  onOpenAuth: () => void;
}

// Helper function to safely format dates and avoid "Invalid Date"
function formatSafeDate(dateVal?: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateVal) return 'Recently';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-GB', options || { day: 'numeric', month: 'short', year: 'numeric' });
}

export const BlogPortal: React.FC<BlogPortalProps> = ({ currentUser, onOpenAuth }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // New Post Creation Modal (for Staff & Teachers)
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'JOB_CIRCULAR' | 'EXAM_TIPS' | 'TOPIC_ANALYSIS' | 'ANNOUNCEMENT'>('EXAM_TIPS');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [galleryImagesInput, setGalleryImagesInput] = useState('');
  const [downloadAttachmentUrl, setDownloadAttachmentUrl] = useState('');
  const [savingPost, setSavingPost] = useState(false);

  // Comment Box State
  const [commentContent, setCommentContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Lightbox Gallery image index
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isTeacherOrStaff = currentUser && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(currentUser.role);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await fetchBlogPosts(selectedCategory !== 'ALL' ? selectedCategory : undefined, search || undefined);
      setPosts(data);
    } catch (e) {
      console.error('Failed to load blog posts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPosts();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, search]);

  const handleLikePost = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await likeBlogPost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: updated.likes } : p)));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev) => (prev ? { ...prev, likes: updated.likes } : null));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !commentContent.trim()) return;

    setSubmittingComment(true);
    try {
      const authorName = currentUser ? currentUser.name : guestName.trim() || 'Aspirant Student';
      const authorRole = currentUser ? currentUser.role : 'STUDENT';
      const authorAvatar = currentUser?.avatar;
      const authorEmail = currentUser?.email || guestEmail.trim() || undefined;

      const updatedPost = await addBlogComment(selectedPost.id, {
        content: commentContent.trim(),
        authorName,
        authorRole,
        authorAvatar,
        authorEmail
      });

      setSelectedPost(updatedPost);
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
      setCommentContent('');
    } catch (err) {
      console.error('Failed to add comment', err);
      alert('Could not submit comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      const updatedPost = await likeBlogComment(selectedPost.id, commentId);
      setSelectedPost(updatedPost);
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    } catch (err) {
      console.error('Failed to like comment', err);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSavingPost(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const galleryImages = galleryImagesInput
        .split('\n')
        .map((img) => img.trim())
        .filter(Boolean);

      const newPost = await createBlogPost({
        title,
        content,
        category,
        tags,
        coverImage: coverImage.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        audioUrl: audioUrl.trim() || undefined,
        galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
        downloadAttachmentUrl: downloadAttachmentUrl.trim() || undefined
      });

      setPosts((prev) => [newPost, ...prev]);
      setIsCreatingPost(false);
      setTitle('');
      setContent('');
      setTagsInput('');
      setCoverImage('');
      setVideoUrl('');
      setAudioUrl('');
      setGalleryImagesInput('');
      setDownloadAttachmentUrl('');
      setSelectedPost(newPost);
    } catch (e) {
      console.error('Failed to create post', e);
      alert('Failed to publish post.');
    } finally {
      setSavingPost(false);
    }
  };

  const copyPostShareLink = (post: BlogPost) => {
    const url = window.location.origin + window.location.pathname + `#blog-${post.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const categories = [
    { id: 'ALL', label: 'All Updates', icon: Newspaper },
    { id: 'JOB_CIRCULAR', label: 'Job Circulars & BCS', icon: Briefcase },
    { id: 'TOPIC_ANALYSIS', label: 'Topic & Subject Analysis', icon: BookOpen },
    { id: 'EXAM_TIPS', label: 'Preparation & Strategies', icon: Award },
    { id: 'ANNOUNCEMENT', label: 'Exam Routine & Notices', icon: Calendar }
  ];

  // Helper to render YouTube iframe or HTML5 video
  const renderVideoEmbed = (url?: string) => {
    if (!url) return null;
    let embedSrc = url;

    // Handle youtube urls (watch?v= or youtu.be/)
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('watch?v=')[1]?.split('&')[0];
      embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}`;
    }

    const isIframe = embedSrc.includes('youtube') || embedSrc.includes('vimeo');

    return (
      <div className="my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md">
        <div className="px-4 py-2 bg-slate-900 text-slate-300 text-xs font-bold flex items-center gap-2 border-b border-slate-800">
          <Video className="w-4 h-4 text-indigo-400" />
          <span>Featured Video Lecture / Circular Discussion</span>
        </div>
        <div className="relative aspect-video w-full">
          {isIframe ? (
            <iframe
              src={embedSrc}
              title="Blog Video Player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <video src={url} controls className="w-full h-full object-cover">
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/15 via-violet-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Newspaper className="w-3.5 h-3.5 text-indigo-400" />
              <span>ProshnoSiddhi Academic & Career Press</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              WordPress-style Editorial, Job Circulars & Multimedia
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Read comprehensive job circular analyses, audio podcast lectures, video breakdowns, downloadable syllabus PDFs, and interactive discussion threads from expert mentors.
            </p>
          </div>

          {/* Teacher / Staff Publish Button */}
          {isTeacherOrStaff && (
            <button
              onClick={() => setIsCreatingPost(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-950/40 transition shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publish Rich Article</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search circulars, video lectures, topics, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((c) => {
              const Icon = c.icon;
              const isActive = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Loading editorial articles and multimedia updates...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <Newspaper className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800">No blog posts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or switching to another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            const isCircular = post.category === 'JOB_CIRCULAR';
            const hasVideo = !!post.videoUrl;
            const hasAudio = !!post.audioUrl;
            const hasGallery = !!(post.galleryImages && post.galleryImages.length > 0);
            const hasAttachment = !!post.downloadAttachmentUrl;
            const commentCount = post.comments ? post.comments.length : 0;

            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col cursor-pointer group"
              >
                {/* Cover Image & Badges */}
                {post.coverImage ? (
                  <div className="h-48 w-full overflow-hidden bg-slate-100 relative">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${
                          isCircular
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {post.category.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Media Type Badges */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                      {hasVideo && (
                        <span className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white shadow-xs" title="Contains Video Lecture">
                          <Video className="w-3.5 h-3.5 text-rose-400" />
                        </span>
                      )}
                      {hasAudio && (
                        <span className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white shadow-xs" title="Contains Audio Lecture">
                          <Music className="w-3.5 h-3.5 text-amber-400" />
                        </span>
                      )}
                      {hasGallery && (
                        <span className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white shadow-xs" title="Contains Image Gallery">
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        </span>
                      )}
                      {hasAttachment && (
                        <span className="p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white shadow-xs" title="Contains PDF Download">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-slate-100 to-indigo-50 border-b border-slate-100 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isCircular
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {post.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasVideo && <Video className="w-3.5 h-3.5 text-rose-500" />}
                      {hasAudio && <Music className="w-3.5 h-3.5 text-amber-500" />}
                      {hasGallery && <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />}
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {post.content.replace(/[#*`$]/g, '')}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700 truncate max-w-[110px]">{post.authorName}</span>
                      <span>•</span>
                      <span>{formatSafeDate(post.publishedAt || (post as any).createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => handleLikePost(post.id, e)}
                        className="flex items-center gap-1 hover:text-rose-600 transition"
                        title="Like Post"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>{post.likes}</span>
                      </button>

                      <span className="flex items-center gap-1" title="Comments">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{commentCount}</span>
                      </span>

                      <span className="flex items-center gap-1" title="Views">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{post.views}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* WordPress Full Article Modal Reader with Rich Media & Comments */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white uppercase">
                  {selectedPost.category.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400">
                  {formatSafeDate(selectedPost.publishedAt || (selectedPost as any).createdAt, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyPostShareLink(selectedPost)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Share'}</span>
                </button>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Close reader"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Article Content & Multimedia Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Cover Image */}
              {selectedPost.coverImage && (
                <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 shadow-xs">
                  <img
                    src={selectedPost.coverImage}
                    alt={selectedPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Author Info */}
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight">
                  {selectedPost.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                      {selectedPost.authorName.charAt(0)}
                    </span>
                    <span>By <strong>{selectedPost.authorName}</strong> ({selectedPost.authorRole})</span>
                  </span>
                  <span>•</span>
                  <span>{selectedPost.views} views</span>
                  <span>•</span>
                  <span>{selectedPost.likes} likes</span>
                </div>
              </div>

              {/* Video Embed Section (WordPress style) */}
              {selectedPost.videoUrl && renderVideoEmbed(selectedPost.videoUrl)}

              {/* Audio Podcast / Lecture Section */}
              {selectedPost.audioUrl && (
                <div className="my-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span>Official Audio Lecture / Podcast Discussion</span>
                  </div>
                  <audio controls className="w-full rounded-xl">
                    <source src={selectedPost.audioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Downloadable PDF Attachment (WordPress style) */}
              {selectedPost.downloadAttachmentUrl && (
                <div className="my-5 p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        Official Notice & Exam Routine (PDF)
                      </h4>
                      <p className="text-[11px] text-slate-600">Download the complete verified circular attachment</p>
                    </div>
                  </div>

                  <a
                    href={selectedPost.downloadAttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Attachment</span>
                  </a>
                </div>
              )}

              {/* Image Gallery (WordPress style Grid & Lightbox) */}
              {selectedPost.galleryImages && selectedPost.galleryImages.length > 0 && (
                <div className="my-6 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span>Photo Gallery & Official Circular Snippets ({selectedPost.galleryImages.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedPost.galleryImages.map((imgUrl, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        className="relative h-28 sm:h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                      >
                        <img
                          src={imgUrl}
                          alt={`Gallery image ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedPost.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Body Text with MathJax & Markdown Support */}
              <div className="text-sm sm:text-base text-slate-800 leading-relaxed space-y-4 pt-4 border-t border-slate-100">
                <MathJaxView text={selectedPost.content} />
              </div>

              {/* Post Interaction Bar */}
              <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleLikePost(selectedPost.id)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition active:scale-95"
                >
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  <span>Like this article ({selectedPost.likes})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPostShareLink(selectedPost)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Post</span>
                  </button>
                </div>
              </div>

              {/* WordPress Comment Section */}
              <div className="pt-8 border-t border-slate-200 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span>Discussion & Comments ({selectedPost.comments ? selectedPost.comments.length : 0})</span>
                  </h3>
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Leave a Comment or Question
                  </h4>

                  {!currentUser && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Your Name (e.g. Arif Rahman)"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="Your Email (Optional)"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <textarea
                    rows={3}
                    required
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Ask a question, share advice, or leave feedback on this post..."
                    className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />

                  <div className="flex items-center justify-between pt-1">
                    {!currentUser && (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Sign in for verified avatar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submittingComment || !commentContent.trim()}
                      className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
                    </button>
                  </div>
                </form>

                {/* Comment List */}
                <div className="space-y-3">
                  {(!selectedPost.comments || selectedPost.comments.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No comments yet. Be the first to start the discussion!
                    </p>
                  ) : (
                    selectedPost.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                              {comment.authorAvatar ? (
                                <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                              ) : (
                                comment.authorName.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900">{comment.authorName}</span>
                                {comment.authorRole && comment.authorRole !== 'STUDENT' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                                    {comment.authorRole}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {formatSafeDate(comment.createdAt, {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-600 transition"
                            title="Like comment"
                          >
                            <ThumbsUp className="w-3 h-3 text-slate-500" />
                            <span>{comment.likes || 0}</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed pl-9">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleLikePost(selectedPost.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 transition"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>{selectedPost.likes} Likes</span>
              </button>

              <button
                onClick={() => setSelectedPost(null)}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition"
              >
                Close Article
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal for Gallery Images */}
      {lightboxIndex !== null && selectedPost && selectedPost.galleryImages && (
        <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl max-h-[85vh] flex items-center justify-center">
            <img
              src={selectedPost.galleryImages[lightboxIndex]}
              alt={`Gallery preview ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
          </div>

          <div className="flex items-center gap-4 mt-4 text-white text-xs font-semibold">
            <button
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev !== null && prev > 0 ? prev - 1 : (selectedPost.galleryImages?.length || 1) - 1
                )
              }
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span>
              {lightboxIndex + 1} / {selectedPost.galleryImages.length}
            </span>
            <button
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev !== null && selectedPost.galleryImages && prev < selectedPost.galleryImages.length - 1
                    ? prev + 1
                    : 0
                )
              }
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Create New WordPress Article Modal (Teacher / Staff) */}
      {isCreatingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="bg-gradient-to-r from-indigo-900 to-violet-900 text-white p-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">WordPress-Style Post & Media Publisher</h3>
              </div>
              <button
                onClick={() => setIsCreatingPost(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="JOB_CIRCULAR">Job Circular & Recruitment Notice</option>
                  <option value="TOPIC_ANALYSIS">Topic & Subject In-depth Analysis</option>
                  <option value="EXAM_TIPS">Exam Preparation Tips & Strategies</option>
                  <option value="ANNOUNCEMENT">Official Routine & Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Post Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 47th BCS Preliminary Circular Analysis & Recommended Booklist"
                  className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Article Content (Supports Markdown & LaTeX Math Formulas)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">WordPress Gutenberg Markdown</span>
                </div>

                {/* Quick Editor Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100 rounded-t-xl border border-b-0 border-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + '\n## Section Heading\n')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded font-bold text-slate-700 text-[11px]"
                    title="Insert Heading"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + '**Bold Text**')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded font-bold text-slate-700 text-[11px]"
                    title="Insert Bold Text"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + '*Italic Text*')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded italic font-serif text-slate-700 text-[11px]"
                    title="Insert Italic Text"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + '\n> Important quote or exam notice callout\n')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-[11px]"
                    title="Insert Quote/Callout block"
                  >
                    Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + '\n- Key point 1\n- Key point 2\n')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-[11px]"
                    title="Insert Bullet list"
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + ' $\\sqrt{x^2 + y^2} = z$ ')}
                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-mono text-indigo-700 text-[11px]"
                    title="Insert LaTeX Formula"
                  >
                    $f(x)$
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => prev + '\n[Download Attachment](https://example.com/sheet.pdf)\n')}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 text-[11px]"
                    title="Insert Link"
                  >
                    Link
                  </button>
                </div>

                <textarea
                  rows={7}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write full article content, requirements, guidelines, formulas, or syllabus analysis..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-b-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Multimedia Embeds */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold uppercase text-indigo-700 tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> WordPress Multimedia Embeds (Optional)
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Video Embed URL (YouTube or MP4)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Audio Podcast URL (MP3 / Audio)</label>
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/lecture-audio.mp3"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Gallery Image URLs (One URL per line)
                  </label>
                  <textarea
                    rows={2}
                    value={galleryImagesInput}
                    onChange={(e) => setGalleryImagesInput(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1&#10;https://images.unsplash.com/photo-2"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Downloadable PDF / Circular URL</label>
                  <input
                    type="url"
                    value={downloadAttachmentUrl}
                    onChange={(e) => setDownloadAttachmentUrl(e.target.value)}
                    placeholder="https://bpsc.gov.bd/circular.pdf"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="BCS, Bank, Math, Circular, 2026"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingPost(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPost}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {savingPost ? 'Publishing...' : 'Publish Article'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
