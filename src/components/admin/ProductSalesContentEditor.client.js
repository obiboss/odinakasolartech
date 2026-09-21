"use client";

/* eslint-disable @next/next/no-img-element -- local blob previews are not compatible with next/image */
import { useRef, useState } from "react";
import ProductImageSelector from "@/components/admin/ProductImageSelector.client";
import AdminAccordionSection from "@/components/admin/AdminAccordionSection.client";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function Field({ label, help, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {help ? <span className="mt-1 block text-[11px] text-slate-500">{help}</span> : null}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20";
}

function textareaClass() {
  return `${inputClass()} min-h-24 resize-y`;
}

function SimpleFormattedTextEditor({ value, onChange }) {
  const textareaRef = useRef(null);

  function replaceSelection(transform) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const replacement = transform(value.slice(start, end));
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2" aria-label="Text formatting">
        <button type="button" onClick={() => replaceSelection((selection) => `**${selection || "bold text"}**`)} className="min-h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">B</button>
        <button type="button" onClick={() => replaceSelection((selection) => (selection || "List item").split("\n").map((line) => line.startsWith("- ") ? line : `- ${line}`).join("\n"))} className="min-h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">• Bullets</button>
      </div>
      <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter section content" className={`${textareaClass()} min-h-72`} />
    </div>
  );
}

function EducationImageUpload({ value, onChange, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function selectImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG, JPEG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const uploadedUrl = await onUpload(file);
      if (!uploadedUrl) throw new Error("Missing uploaded image URL.");
      onChange(uploadedUrl);
    } catch {
      setError("The image could not be uploaded. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const triggerClass = `inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 ${uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`;

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700">Section image</div>
      {value ? (
        <div className="mt-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
            <img src={value} alt="Product education preview" className="mx-auto block h-auto max-h-80 max-w-full object-contain" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className={triggerClass}>
              {uploading ? "Uploading..." : "Change image"}
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={selectImage} className="sr-only" />
            </label>
            <button type="button" disabled={uploading} onClick={() => { setError(""); onChange(""); }} className="min-h-11 cursor-pointer rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">Remove</button>
          </div>
        </div>
      ) : (
        <label className={`${triggerClass} mt-2 w-full border-dashed py-5`}>
          {uploading ? "Uploading..." : "+ Choose image"}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={selectImage} className="sr-only" />
        </label>
      )}
      {error ? <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

function Section({ title, summary, enabled, onToggle, children }) {
  const status = [summary, enabled ? "Visible" : "Hidden"].filter(Boolean).join(" • ");
  return (
    <AdminAccordionSection title={title} summary={status}>
      <div className="space-y-4">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          <span>Show on product page</span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-amber-500" : "bg-slate-300"}`}>
            <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} className="peer sr-only" />
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-amber-700 peer-focus-visible:ring-offset-2 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
          </span>
        </label>
        <div className="space-y-3">{children}</div>
      </div>
    </AdminAccordionSection>
  );
}

function AddRemove({ onAdd, addLabel = "Add another" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onAdd} className="cursor-pointer rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
        + {addLabel}
      </button>
    </div>
  );
}

export default function ProductSalesContentEditor({ value, onChange, productImages = [], onUploadEducationImage }) {
  const content = value || {};
  const section = (key) => content[key] || {};

  function updateSection(key, patch) {
    onChange((previousValue) => {
      const previousContent = previousValue || {};
      return {
        ...previousContent,
        [key]: { ...(previousContent[key] || {}), ...patch },
      };
    });
  }

  function updateSectionImage(key, imageUrl) {
    updateSection(key, { image_url: String(imageUrl || "") });
  }

  function updateItem(key, listKey, index, patch) {
    const list = Array.isArray(section(key)[listKey]) ? section(key)[listKey] : [];
    updateSection(key, { [listKey]: list.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }

  function addItem(key, listKey, prefix, defaults = {}) {
    const list = Array.isArray(section(key)[listKey]) ? section(key)[listKey] : [];
    updateSection(key, { [listKey]: [...list, { id: makeId(prefix), ...defaults }] });
  }

  function removeItem(key, listKey, index) {
    const list = Array.isArray(section(key)[listKey]) ? section(key)[listKey] : [];
    updateSection(key, { [listKey]: list.filter((_, itemIndex) => itemIndex !== index) });
  }

  function moveItem(key, listKey, index, direction) {
    const list = Array.isArray(section(key)[listKey]) ? [...section(key)[listKey]] : [];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
    updateSection(key, { [listKey]: list });
  }

  function selectTestimonialImage(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    const current = section("testimonials").items?.[index];
    if (current?.imagePreviewUrl) URL.revokeObjectURL(current.imagePreviewUrl);
    updateItem("testimonials", "items", index, { imageFile: file, imagePreviewUrl: URL.createObjectURL(file), remove_image: false });
  }

  function renderItems(key, listKey, fields, prefix, addLabel) {
    const list = Array.isArray(section(key)[listKey]) ? section(key)[listKey] : [];
    return (
      <div className="space-y-3">
        {list.map((item, index) => (
          <div key={item.id || `${prefix}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <Field key={field.key} label={field.label}>
                  {field.multiline ? (
                    <textarea value={item[field.key] || ""} onChange={(event) => updateItem(key, listKey, index, { [field.key]: event.target.value })} placeholder={field.placeholder} className={textareaClass()} />
                  ) : (
                    <input value={item[field.key] || ""} onChange={(event) => updateItem(key, listKey, index, { [field.key]: event.target.value })} placeholder={field.placeholder} className={inputClass()} />
                  )}
                </Field>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => moveItem(key, listKey, index, -1)} disabled={index === 0} className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Move up</button>
              <button type="button" onClick={() => moveItem(key, listKey, index, 1)} disabled={index === list.length - 1} className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Move down</button>
              <button type="button" onClick={() => removeItem(key, listKey, index)} className="cursor-pointer rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50">Remove</button>
            </div>
          </div>
        ))}
        <AddRemove addLabel={addLabel} onAdd={() => addItem(key, listKey, prefix)} />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="font-bold">Product sales page</div>
        <p className="mt-1 text-xs leading-5">Open a section to edit it. Turn it on when it is ready for customers.</p>
      </div>

      <Section title="Offer and urgency" help="Use this for a real, time-limited promotion or limited stock message." enabled={!!section("urgency").enabled} onToggle={(enabled) => updateSection("urgency", { enabled })}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Stock remaining"><input value={section("urgency").units_left || ""} onChange={(event) => updateSection("urgency", { units_left: event.target.value })} placeholder="Enter quantity" className={inputClass()} /></Field>
          <Field label="Offer deadline"><input value={section("urgency").deadline || ""} onChange={(event) => updateSection("urgency", { deadline: event.target.value })} placeholder="Enter deadline" className={inputClass()} /></Field>
        </div>
        <Field label="Offer heading"><input value={section("urgency").message || ""} onChange={(event) => updateSection("urgency", { message: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Offer text"><input value={section("urgency").promo_message || ""} onChange={(event) => updateSection("urgency", { promo_message: event.target.value })} placeholder="Enter offer text" className={inputClass()} /></Field>
      </Section>

      <Section title="Hero promise" help="Give visitors the main outcome this product delivers." enabled={!!section("hero").enabled} onToggle={(enabled) => updateSection("hero", { enabled })}>
        <Field label="Small label"><input value={section("hero").eyebrow || ""} onChange={(event) => updateSection("hero", { eyebrow: event.target.value })} placeholder="Enter label" className={inputClass()} /></Field>
        <Field label="Headline"><textarea value={section("hero").headline || ""} onChange={(event) => updateSection("hero", { headline: event.target.value })} placeholder="Enter headline" className={textareaClass()} /></Field>
        <Field label="Subheading"><textarea value={section("hero").subheadline || ""} onChange={(event) => updateSection("hero", { subheadline: event.target.value })} placeholder="Enter subheading" className={textareaClass()} /></Field>
        <Field label="Promise"><textarea value={section("hero").promise || ""} onChange={(event) => updateSection("hero", { promise: event.target.value })} placeholder="Enter promise" className={textareaClass()} /></Field>
        <Field label="Button text"><input value={section("hero").cta_label || ""} onChange={(event) => updateSection("hero", { cta_label: event.target.value })} placeholder="Enter button text" className={inputClass()} /></Field>
      </Section>

      <Section title="Customer testimonial videos" summary={`${section("video").videos?.length || 0} videos`} help="Add customer videos that visitors can watch on the product page." enabled={!!section("video").enabled} onToggle={(enabled) => updateSection("video", { enabled })}>
        <Field label="Heading"><input value={section("video").heading || ""} onChange={(event) => updateSection("video", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        {renderItems("video", "videos", [{ key: "url", label: "Video link", placeholder: "Paste video link" }, { key: "title", label: "Title", placeholder: "Enter optional title" }], "video", "Add video")}
      </Section>

      <Section title="Everything included" summary={`${section("bonuses").items?.length || 0} items`} help="List what the customer receives with this product or promotion." enabled={!!section("bonuses").enabled} onToggle={(enabled) => updateSection("bonuses", { enabled })}>
        <Field label="Heading"><input value={section("bonuses").heading || ""} onChange={(event) => updateSection("bonuses", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Availability text"><input value={section("bonuses").progress_text || ""} onChange={(event) => updateSection("bonuses", { progress_text: event.target.value })} placeholder="Enter availability text" className={inputClass()} /></Field><Field label="Progress"><input type="number" min="0" max="100" value={section("bonuses").progress_percent || ""} onChange={(event) => updateSection("bonuses", { progress_percent: event.target.value })} placeholder="Enter percentage" className={inputClass()} /></Field></div>
        <ProductImageSelector value={section("bonuses").image_url || ""} images={productImages} onChange={(imageUrl) => updateSectionImage("bonuses", imageUrl)} />
        <Field label="Paragraph"><textarea value={section("bonuses").intro || ""} onChange={(event) => updateSection("bonuses", { intro: event.target.value })} placeholder="Enter paragraph" className={textareaClass()} /></Field>
        {renderItems("bonuses", "items", [{ key: "title", label: "Item name", placeholder: "Enter item name" }, { key: "description", label: "Detail", placeholder: "Enter optional detail", multiline: true }], "order-item", "Add item")}
        <Field label="Note"><textarea value={section("bonuses").note || ""} onChange={(event) => updateSection("bonuses", { note: event.target.value })} placeholder="Enter optional note" className={textareaClass()} /></Field>
      </Section>

      <Section title="Pain and problem" help="Explain the customer problem this product solves in clear, respectful language." enabled={!!section("problem").enabled} onToggle={(enabled) => updateSection("problem", { enabled })}>
        <ProductImageSelector value={section("problem").image_url || ""} images={productImages} onChange={(imageUrl) => updateSectionImage("problem", imageUrl)} />
        <Field label="Main text" help="Use **double asterisks** for bold text. Leave a blank line between paragraphs."><textarea value={section("problem").content || ""} onChange={(event) => updateSection("problem", { content: event.target.value })} placeholder="Enter main text" className={`${textareaClass()} min-h-48`} /></Field>
        <Field label="Button text"><input value={section("problem").button_text || ""} onChange={(event) => updateSection("problem", { button_text: event.target.value })} placeholder="Enter button text" className={inputClass()} /></Field>
      </Section>

      <Section title="What can it power?" summary={`${section("capabilities").items?.length || 0} items`} help="Describe the appliances or equipment this solar system can power, and optionally add a demonstration video." enabled={!!section("capabilities").enabled} onToggle={(enabled) => updateSection("capabilities", { enabled })}>
        <Field label="Heading"><input value={section("capabilities").heading || ""} onChange={(event) => updateSection("capabilities", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <ProductImageSelector value={section("capabilities").image_url || ""} images={productImages} onChange={(imageUrl) => updateSectionImage("capabilities", imageUrl)} />
        {renderItems("capabilities", "items", [{ key: "name", label: "Appliance or item name", placeholder: "Enter name" }, { key: "description", label: "Optional explanation", placeholder: "Enter optional explanation", multiline: true }], "capability", "Add item")}
        <Field label="Bottom summary"><textarea value={section("capabilities").summary || ""} onChange={(event) => updateSection("capabilities", { summary: event.target.value })} placeholder="Enter summary" className={textareaClass()} /></Field>
      </Section>

      <Section title="Emotional and family benefits" help="Show the comfort, confidence, time, or business benefits customers can expect." enabled={!!section("benefits").enabled} onToggle={(enabled) => updateSection("benefits", { enabled })}>
        <Field label="Heading"><input value={section("benefits").heading || ""} onChange={(event) => updateSection("benefits", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Main content"><SimpleFormattedTextEditor value={section("benefits").content || ""} onChange={(contentValue) => updateSection("benefits", { content: contentValue })} /></Field>
      </Section>

      <Section title="Product education" help="Explain important product features in simple language." enabled={!!section("education").enabled} onToggle={(enabled) => updateSection("education", { enabled })}>
        <Field label="Heading"><input value={section("education").heading || ""} onChange={(event) => updateSection("education", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <EducationImageUpload value={section("education").image_url || ""} onUpload={onUploadEducationImage} onChange={(imageUrl) => updateSectionImage("education", imageUrl)} />
        <Field label="Main content"><SimpleFormattedTextEditor value={section("education").content || ""} onChange={(contentValue) => updateSection("education", { content: contentValue })} /></Field>
        <Field label="Button text"><input value={section("education").button_text || ""} onChange={(event) => updateSection("education", { button_text: event.target.value })} placeholder="Enter button text" className={inputClass()} /></Field>
      </Section>

      <Section title="How it works" help="Describe the customer journey from order to delivery or installation." enabled={!!section("how_it_works").enabled} onToggle={(enabled) => updateSection("how_it_works", { enabled })}>
        <Field label="Heading"><input value={section("how_it_works").heading || ""} onChange={(event) => updateSection("how_it_works", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        {renderItems("how_it_works", "steps", [{ key: "title", label: "Step name", placeholder: "Enter step name" }, { key: "body", label: "Explanation", placeholder: "Enter explanation", multiline: true }], "step", "Add step")}
      </Section>

      <Section title="Package section" help="Choose the customer-facing heading and introduction shown above the packages managed below." enabled={!!section("packages").enabled} onToggle={(enabled) => updateSection("packages", { enabled })}>
        <Field label="Heading"><input value={section("packages").heading || ""} onChange={(event) => updateSection("packages", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Paragraph"><textarea value={section("packages").intro || ""} onChange={(event) => updateSection("packages", { intro: event.target.value })} placeholder="Enter paragraph" className={textareaClass()} /></Field>
      </Section>

      <Section title="Customer testimonials" summary={`${section("testimonials").items?.length || 0} reviews`} help="Add customer experiences that you want to show prominently on the product page." enabled={!!section("testimonials").enabled} onToggle={(enabled) => updateSection("testimonials", { enabled })}>
        <Field label="Heading"><input value={section("testimonials").heading || ""} onChange={(event) => updateSection("testimonials", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Paragraph"><textarea value={section("testimonials").intro || ""} onChange={(event) => updateSection("testimonials", { intro: event.target.value })} placeholder="Enter paragraph" className={textareaClass()} /></Field>
        <div className="space-y-3">
          {(section("testimonials").items || []).map((item, index) => (
            <div key={item.id || index} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid gap-3 sm:grid-cols-[8rem,1fr]">
                <div>
                  <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">{item.imagePreviewUrl || item.image_url ? <img src={item.imagePreviewUrl || item.image_url} alt="Customer preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-400">Customer photo</div>}</div>
                  <label className="mt-2 block cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-center text-xs font-semibold text-amber-900">Choose photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectTestimonialImage(index, event)} className="sr-only" /></label>
                </div>
                <div className="space-y-3"><Field label="Customer name"><input value={item.name || ""} onChange={(event) => updateItem("testimonials", "items", index, { name: event.target.value })} placeholder="Enter customer name" className={inputClass()} /></Field><Field label="Testimonial"><textarea value={item.text || ""} onChange={(event) => updateItem("testimonials", "items", index, { text: event.target.value })} placeholder="Enter testimonial" className={textareaClass()} /></Field><label className="inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={item.active !== false} onChange={(event) => updateItem("testimonials", "items", index, { active: event.target.checked })} /> Published</label></div>
              </div>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => moveItem("testimonials", "items", index, -1)} disabled={index === 0} className="cursor-pointer rounded-lg border px-2 py-1 text-[11px] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Move up</button><button type="button" onClick={() => moveItem("testimonials", "items", index, 1)} disabled={index === section("testimonials").items.length - 1} className="cursor-pointer rounded-lg border px-2 py-1 text-[11px] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Move down</button><button type="button" onClick={() => removeItem("testimonials", "items", index)} className="cursor-pointer rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50">Remove</button></div>
            </div>
          ))}
          <AddRemove addLabel="Add testimonial" onAdd={() => addItem("testimonials", "items", "testimonial", { active: true })} />
        </div>
      </Section>

      <Section title="Order information" help="Show product-specific delivery or payment information before the order form." enabled={!!section("delivery").enabled} onToggle={(enabled) => updateSection("delivery", { enabled })}>
        <Field label="Heading"><input value={section("delivery").heading || ""} onChange={(event) => updateSection("delivery", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Notice text"><SimpleFormattedTextEditor value={section("delivery").content || ""} onChange={(contentValue) => updateSection("delivery", { content: contentValue })} /></Field>
        <Field label="Button text"><input value={section("delivery").button_text || ""} onChange={(event) => updateSection("delivery", { button_text: event.target.value })} placeholder="Enter button text" className={inputClass()} /></Field>
        <Field label="Text below button"><input value={section("delivery").text_below || ""} onChange={(event) => updateSection("delivery", { text_below: event.target.value })} placeholder="Enter text" className={inputClass()} /></Field>
      </Section>

      <Section title="Frequently asked questions" summary={`${section("faq").items?.length || 0} questions`} help="Add the questions customers ask most often about this product." enabled={!!section("faq").enabled} onToggle={(enabled) => updateSection("faq", { enabled })}>
        <Field label="Heading"><input value={section("faq").heading || ""} onChange={(event) => updateSection("faq", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        {renderItems("faq", "items", [{ key: "question", label: "Question", placeholder: "Enter question" }, { key: "answer", label: "Answer", placeholder: "Enter answer", multiline: true }], "faq", "Add question")}
      </Section>

      <Section title="Final call to action" help="Close the page with a clear invitation to order." enabled={!!section("final_cta").enabled} onToggle={(enabled) => updateSection("final_cta", { enabled })}>
        <Field label="Heading"><input value={section("final_cta").heading || ""} onChange={(event) => updateSection("final_cta", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Paragraph"><textarea value={section("final_cta").body || ""} onChange={(event) => updateSection("final_cta", { body: event.target.value })} placeholder="Enter paragraph" className={textareaClass()} /></Field>
      </Section>

      <Section title="Guarantee, shipping & contact" help="Add information that applies specifically to this product page. Global footer content remains managed by the site." enabled={!!(section("guarantee").enabled || section("shipping").enabled || section("contact").enabled)} onToggle={(enabled) => {
        updateSection("guarantee", { enabled });
        updateSection("shipping", { enabled });
        updateSection("contact", { enabled });
      }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact heading"><input value={section("contact").number_heading || ""} onChange={(event) => updateSection("contact", { number_heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
          <Field label="Contact number"><input value={section("contact").phone || ""} onChange={(event) => updateSection("contact", { phone: event.target.value })} placeholder="Enter phone number" className={inputClass()} /></Field>
        </div>
        <Field label="Guarantee heading"><input value={section("guarantee").heading || ""} onChange={(event) => updateSection("guarantee", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Guarantee text"><textarea value={section("guarantee").body || ""} onChange={(event) => updateSection("guarantee", { body: event.target.value })} placeholder="Enter content" className={textareaClass()} /></Field>
        <Field label="Shipping heading"><input value={section("shipping").heading || ""} onChange={(event) => updateSection("shipping", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Shipping text"><textarea value={section("shipping").body || ""} onChange={(event) => updateSection("shipping", { body: event.target.value })} placeholder="Enter content" className={textareaClass()} /></Field>
        <Field label="Contact heading"><input value={section("contact").heading || ""} onChange={(event) => updateSection("contact", { heading: event.target.value })} placeholder="Enter heading" className={inputClass()} /></Field>
        <Field label="Contact text"><textarea value={section("contact").body || ""} onChange={(event) => updateSection("contact", { body: event.target.value })} placeholder="Enter content" className={textareaClass()} /></Field>
      </Section>
    </div>
  );
}
