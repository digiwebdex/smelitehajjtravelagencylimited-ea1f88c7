import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import ImageUpload from "./ImageUpload";
import { Plus, Edit, Trash2, Eye, FileText, BookOpen, FolderOpen } from "lucide-react";
import { format } from "date-fns";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  order_index: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  seo_title: string | null;
  meta_description: string | null;
  category_id: string | null;
  is_published: boolean;
  published_at: string | null;
  view_count: number;
  created_at: string;
  category?: { name: string };
}

const AdminBlog = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("posts");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);

  const { uploadImage, uploading } = useImageUpload({
    bucket: "admin-uploads",
    folder: "blog",
  });

  const [postForm, setPostForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image_url: "",
    seo_title: "",
    meta_description: "",
    category_id: "",
    is_published: false,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("blog_categories")
      .select("*")
      .order("order_index", { ascending: true });

    if (!error && data) setCategories(data);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(`
        *,
        category:blog_categories(name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) setPosts(data as BlogPost[]);
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
  };

  // Post handlers
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const postData = {
      title: postForm.title,
      slug: postForm.slug || generateSlug(postForm.title),
      content: postForm.content,
      excerpt: postForm.excerpt || null,
      featured_image_url: postForm.featured_image_url || null,
      seo_title: postForm.seo_title || null,
      meta_description: postForm.meta_description || null,
      category_id: postForm.category_id || null,
      is_published: postForm.is_published,
      published_at: postForm.is_published ? new Date().toISOString() : null,
    };

    if (editingPost) {
      const { error } = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", editingPost.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Post updated" });
    } else {
      const { error } = await supabase.from("blog_posts").insert(postData);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Post created" });
    }

    setIsPostDialogOpen(false);
    setEditingPost(null);
    resetPostForm();
    fetchPosts();
  };

  const resetPostForm = () => {
    setPostForm({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featured_image_url: "",
      seo_title: "",
      meta_description: "",
      category_id: "",
      is_published: false,
    });
  };

  const editPost = (post: BlogPost) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      featured_image_url: post.featured_image_url || "",
      seo_title: post.seo_title || "",
      meta_description: post.meta_description || "",
      category_id: post.category_id || "",
      is_published: post.is_published,
    });
    setIsPostDialogOpen(true);
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Success", description: "Post deleted" });
    fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newState = !post.is_published;
    await supabase
      .from("blog_posts")
      .update({
        is_published: newState,
        published_at: newState ? new Date().toISOString() : null,
      })
      .eq("id", post.id);
    fetchPosts();
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: categoryForm.name,
      slug: categoryForm.slug || generateSlug(categoryForm.name),
      description: categoryForm.description || null,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("blog_categories")
        .update(categoryData)
        .eq("id", editingCategory.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Category updated" });
    } else {
      const maxOrder = Math.max(...categories.map((c) => c.order_index), 0);
      const { error } = await supabase.from("blog_categories").insert({ ...categoryData, order_index: maxOrder + 1 });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Category created" });
    }

    setIsCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: "", slug: "", description: "" });
    fetchCategories();
  };

  const editCategory = (cat: BlogCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
    });
    setIsCategoryDialogOpen(true);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await supabase.from("blog_categories").delete().eq("id", id);
    toast({ title: "Success", description: "Category deleted" });
    fetchCategories();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            SEO Blog System
          </CardTitle>
          <CardDescription>
            Create and manage blog articles for SEO and content marketing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="w-4 h-4" />
                Posts ({posts.length})
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Categories ({categories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <div className="flex justify-end mb-4">
                <Dialog open={isPostDialogOpen} onOpenChange={(open) => { setIsPostDialogOpen(open); if (!open) { setEditingPost(null); resetPostForm(); } }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />New Post</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingPost ? "Edit Post" : "Create Post"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePostSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Title *</label>
                        <Input
                          value={postForm.title}
                          onChange={(e) => {
                            setPostForm({
                              ...postForm,
                              title: e.target.value,
                              slug: generateSlug(e.target.value),
                            });
                          }}
                          placeholder="Post title"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Slug</label>
                        <Input
                          value={postForm.slug}
                          onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                          placeholder="url-friendly-slug"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={postForm.category_id}
                          onValueChange={(value) => setPostForm({ ...postForm, category_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <ImageUpload
                        value={postForm.featured_image_url}
                        onChange={(url) => setPostForm({ ...postForm, featured_image_url: url })}
                        onUpload={uploadImage}
                        uploading={uploading}
                        label="Featured Image"
                      />
                      <div>
                        <label className="text-sm font-medium">Excerpt</label>
                        <Textarea
                          value={postForm.excerpt}
                          onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                          placeholder="Brief summary for listing pages"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Content *</label>
                        <Textarea
                          value={postForm.content}
                          onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                          placeholder="Full article content (supports HTML)"
                          rows={10}
                          required
                        />
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">SEO Settings</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">SEO Title</label>
                            <Input
                              value={postForm.seo_title}
                              onChange={(e) => setPostForm({ ...postForm, seo_title: e.target.value })}
                              placeholder="Custom title for search engines (60 chars max)"
                              maxLength={60}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {postForm.seo_title.length}/60 characters
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Meta Description</label>
                            <Textarea
                              value={postForm.meta_description}
                              onChange={(e) => setPostForm({ ...postForm, meta_description: e.target.value })}
                              placeholder="Description for search results (160 chars max)"
                              rows={2}
                              maxLength={160}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {postForm.meta_description.length}/160 characters
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={postForm.is_published}
                          onCheckedChange={(checked) => setPostForm({ ...postForm, is_published: checked })}
                        />
                        <label className="text-sm font-medium">Publish immediately</label>
                      </div>
                      <Button type="submit" className="w-full" disabled={uploading}>
                        {editingPost ? "Update" : "Create"} Post
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{post.title}</div>
                          <div className="text-xs text-muted-foreground">/{post.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {post.category?.name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.is_published ? "default" : "secondary"}>
                          {post.is_published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>{post.view_count}</TableCell>
                      <TableCell>
                        {format(new Date(post.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => togglePublish(post)}>
                            <Eye className={`w-4 h-4 ${post.is_published ? "text-green-500" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => editPost(post)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {posts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No blog posts yet. Create your first article!
                </p>
              )}
            </TabsContent>

            <TabsContent value="categories">
              <div className="flex justify-end mb-4">
                <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) { setEditingCategory(null); setCategoryForm({ name: "", slug: "", description: "" }); } }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />New Category</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Name *</label>
                        <Input
                          value={categoryForm.name}
                          onChange={(e) => {
                            setCategoryForm({
                              ...categoryForm,
                              name: e.target.value,
                              slug: generateSlug(e.target.value),
                            });
                          }}
                          placeholder="Category name"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Slug</label>
                        <Input
                          value={categoryForm.slug}
                          onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                          placeholder="url-friendly-slug"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Brief description"
                          rows={2}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingCategory ? "Update" : "Create"} Category
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>/{cat.slug}</TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {cat.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => editCategory(cat)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBlog;
