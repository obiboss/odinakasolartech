"use client";

/* eslint-disable @next/next/no-img-element -- local blob previews are not compatible with next/image */

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

function Section({ title, help, enabled, onToggle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} className="h-4 w-4" />
          Show this section
        </label>
      </div>
      {enabled ? <div className="mt-4 space-y-3">{children}</div> : null}
    </section>
  );
}

function AddRemove({ onAdd, addLabel = "Add another" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onAdd} className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
        + {addLabel}
      </button>
    </div>
  );
}

export default function ProductSalesContentEditor({ value, onChange }) {
  const content = value || {};
  const section = (key) => content[key] || {};

  function updateSection(key, patch) {
    onChange({ ...content, [key]: { ...section(key), ...patch } });
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
              <button type="button" onClick={() => moveItem(key, listKey, index, -1)} disabled={index === 0} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold disabled:opacity-40">Move up</button>
              <button type="button" onClick={() => moveItem(key, listKey, index, 1)} disabled={index === list.length - 1} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold disabled:opacity-40">Move down</button>
              <button type="button" onClick={() => removeItem(key, listKey, index)} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700">Remove</button>
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
        <p className="mt-1 text-xs leading-5">Fill only the sections you need. Turn on a section when it has ready-to-publish content. Empty sections stay hidden from customers.</p>
      </div>

      <Section title="Offer and urgency" help="Use this for a real, time-limited promotion or limited stock message." enabled={!!section("urgency").enabled} onToggle={(enabled) => updateSection("urgency", { enabled })}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Units left" help="Optional. Example: 6"><input value={section("urgency").units_left || ""} onChange={(event) => updateSection("urgency", { units_left: event.target.value })} placeholder="6" className={inputClass()} /></Field>
          <Field label="Offer deadline" help="Optional. Example: Friday at midnight"><input value={section("urgency").deadline || ""} onChange={(event) => updateSection("urgency", { deadline: event.target.value })} placeholder="Friday at midnight" className={inputClass()} /></Field>
        </div>
        <Field label="Urgency message" help="Short message shown beside the units left count."><input value={section("urgency").message || ""} onChange={(event) => updateSection("urgency", { message: event.target.value })} placeholder="Offer closing soon" className={inputClass()} /></Field>
        <Field label="Promotion message"><input value={section("urgency").promo_message || ""} onChange={(event) => updateSection("urgency", { promo_message: event.target.value })} placeholder="Free delivery while this offer lasts" className={inputClass()} /></Field>
      </Section>

      <Section title="Hero promise" help="Give visitors the main outcome this product delivers. The product image comes from your existing gallery." enabled={!!section("hero").enabled} onToggle={(enabled) => updateSection("hero", { enabled })}>
        <Field label="Small label" help="Optional. Example: Reliable home power"><input value={section("hero").eyebrow || ""} onChange={(event) => updateSection("hero", { eyebrow: event.target.value })} placeholder="Reliable home power" className={inputClass()} /></Field>
        <Field label="Headline" help="Example: Power your home through the night"><textarea value={section("hero").headline || ""} onChange={(event) => updateSection("hero", { headline: event.target.value })} placeholder="Power your home through the night" className={textareaClass()} /></Field>
        <Field label="Subheadline"><textarea value={section("hero").subheadline || ""} onChange={(event) => updateSection("hero", { subheadline: event.target.value })} placeholder="A clear, buyer-friendly explanation of the main result." className={textareaClass()} /></Field>
        <Field label="Promise"><textarea value={section("hero").promise || ""} onChange={(event) => updateSection("hero", { promise: event.target.value })} placeholder="Keep your essential appliances running without generator stress." className={textareaClass()} /></Field>
        <Field label="Primary button text"><input value={section("hero").cta_label || ""} onChange={(event) => updateSection("hero", { cta_label: event.target.value })} placeholder="Get this offer" className={inputClass()} /></Field>
      </Section>

      <Section title="Customer testimonial videos" help="Add customer videos that visitors can watch on the product page." enabled={!!section("video").enabled} onToggle={(enabled) => updateSection("video", { enabled })}>
        <Field label="Section heading"><input value={section("video").heading || ""} onChange={(event) => updateSection("video", { heading: event.target.value })} placeholder="Proof from customers already using it" className={inputClass()} /></Field>
        <Field label="Short introduction"><textarea value={section("video").caption || ""} onChange={(event) => updateSection("video", { caption: event.target.value })} placeholder="Watch a customer explain their experience." className={textareaClass()} /></Field>
        {renderItems("video", "videos", [{ key: "url", label: "Video URL", placeholder: "YouTube or Facebook video URL" }, { key: "title", label: "Optional title", placeholder: "Mr. Chinedu's experience" }, { key: "description", label: "Optional description", placeholder: "A short introduction to this video.", multiline: true }], "video", "Add another video")}
      </Section>

      <Section title="Offer and bonuses" help="List what the customer receives with this product or promotion." enabled={!!section("bonuses").enabled} onToggle={(enabled) => updateSection("bonuses", { enabled })}>
        <Field label="Section heading"><input value={section("bonuses").heading || ""} onChange={(event) => updateSection("bonuses", { heading: event.target.value })} placeholder="Everything included with your order" className={inputClass()} /></Field>
        <Field label="Introduction"><textarea value={section("bonuses").intro || ""} onChange={(event) => updateSection("bonuses", { intro: event.target.value })} placeholder="Here is what you get when you order today." className={textareaClass()} /></Field>
        {renderItems("bonuses", "items", [{ key: "title", label: "Bonus name", placeholder: "Free solar iron" }, { key: "description", label: "Description", placeholder: "Useful extra included with the order.", multiline: true }, { key: "value", label: "Optional value", placeholder: "Worth ₦50,000" }], "bonus", "Add another bonus")}
      </Section>

      <Section title="Pain and problem" help="Explain the customer problem this product solves in clear, respectful language." enabled={!!section("problem").enabled} onToggle={(enabled) => updateSection("problem", { enabled })}>
        <Field label="Small label"><input value={section("problem").eyebrow || ""} onChange={(event) => updateSection("problem", { eyebrow: event.target.value })} placeholder="Tired of unreliable power?" className={inputClass()} /></Field>
        <Field label="Heading"><input value={section("problem").heading || ""} onChange={(event) => updateSection("problem", { heading: event.target.value })} placeholder="Stop planning your day around outages" className={inputClass()} /></Field>
        <Field label="Main message"><textarea value={section("problem").body || ""} onChange={(event) => updateSection("problem", { body: event.target.value })} placeholder="Describe the real-life problem in your own words." className={textareaClass()} /></Field>
        {renderItems("problem", "points", [{ key: "title", label: "Problem point", placeholder: "Food spoils during outages" }, { key: "description", label: "Explanation", placeholder: "A short explanation.", multiline: true }], "problem", "Add another problem")}
      </Section>

      <Section title="What can it power?" help="Describe the appliances or equipment this solar system can power, and optionally add a demonstration video." enabled={!!section("capabilities").enabled} onToggle={(enabled) => updateSection("capabilities", { enabled })}>
        <Field label="Section heading"><input value={section("capabilities").heading || ""} onChange={(event) => updateSection("capabilities", { heading: event.target.value })} placeholder="What can it power?" className={inputClass()} /></Field>
        <Field label="Introduction"><textarea value={section("capabilities").intro || ""} onChange={(event) => updateSection("capabilities", { intro: event.target.value })} placeholder="See this system powering everyday appliances." className={textareaClass()} /></Field>
        <Field label="Demonstration video URL" help="YouTube or Facebook video showing what the system can power."><input value={section("capabilities").video_url || ""} onChange={(event) => updateSection("capabilities", { video_url: event.target.value })} placeholder="YouTube or Facebook video URL" className={inputClass()} /></Field>
      </Section>

      <Section title="Emotional and family benefits" help="Show the comfort, confidence, time, or business benefits customers can expect." enabled={!!section("benefits").enabled} onToggle={(enabled) => updateSection("benefits", { enabled })}>
        <Field label="Section heading"><input value={section("benefits").heading || ""} onChange={(event) => updateSection("benefits", { heading: event.target.value })} placeholder="More comfort and peace of mind" className={inputClass()} /></Field>
        <Field label="Introduction"><textarea value={section("benefits").intro || ""} onChange={(event) => updateSection("benefits", { intro: event.target.value })} placeholder="Describe the difference this product makes." className={textareaClass()} /></Field>
        {renderItems("benefits", "items", [{ key: "title", label: "Benefit", placeholder: "Sleep comfortably" }, { key: "description", label: "Explanation", placeholder: "Explain the benefit.", multiline: true }], "benefit", "Add another benefit")}
      </Section>

      <Section title="Product education" help="Explain important product features in simple language." enabled={!!section("education").enabled} onToggle={(enabled) => updateSection("education", { enabled })}>
        <Field label="Section heading"><input value={section("education").heading || ""} onChange={(event) => updateSection("education", { heading: event.target.value })} placeholder="Why this system is different" className={inputClass()} /></Field>
        <Field label="Introduction"><textarea value={section("education").intro || ""} onChange={(event) => updateSection("education", { intro: event.target.value })} placeholder="A short introduction to the product education section." className={textareaClass()} /></Field>
        {renderItems("education", "blocks", [{ key: "title", label: "Topic", placeholder: "Long-lasting battery" }, { key: "body", label: "Explanation", placeholder: "Explain this feature for a buyer.", multiline: true }], "education", "Add another topic")}
      </Section>

      <Section title="How it works" help="Describe the customer journey from order to delivery or installation." enabled={!!section("how_it_works").enabled} onToggle={(enabled) => updateSection("how_it_works", { enabled })}>
        <Field label="Section heading"><input value={section("how_it_works").heading || ""} onChange={(event) => updateSection("how_it_works", { heading: event.target.value })} placeholder="How it works" className={inputClass()} /></Field>
        {renderItems("how_it_works", "steps", [{ key: "title", label: "Step name", placeholder: "Place your order" }, { key: "body", label: "Step explanation", placeholder: "Tell the customer what happens next.", multiline: true }], "step", "Add another step")}
      </Section>

      <Section title="Package section" help="Choose the customer-facing heading and introduction shown above the packages managed below." enabled={!!section("packages").enabled} onToggle={(enabled) => updateSection("packages", { enabled })}>
        <Field label="Small label"><input value={section("packages").eyebrow || ""} onChange={(event) => updateSection("packages", { eyebrow: event.target.value })} placeholder="Choose your package" className={inputClass()} /></Field>
        <Field label="Section heading"><input value={section("packages").heading || ""} onChange={(event) => updateSection("packages", { heading: event.target.value })} placeholder="Choose the package that's right for you" className={inputClass()} /></Field>
        <Field label="Introduction"><textarea value={section("packages").intro || ""} onChange={(event) => updateSection("packages", { intro: event.target.value })} placeholder="Select the package that's right for you." className={textareaClass()} /></Field>
      </Section>

      <Section title="Customer testimonials" help="Add customer experiences that you want to show prominently on the product page. Customer-submitted reviews remain separate." enabled={!!section("testimonials").enabled} onToggle={(enabled) => updateSection("testimonials", { enabled })}>
        <Field label="Section heading"><input value={section("testimonials").heading || ""} onChange={(event) => updateSection("testimonials", { heading: event.target.value })} placeholder="Customer reviews" className={inputClass()} /></Field>
        <Field label="Introduction"><textarea value={section("testimonials").intro || ""} onChange={(event) => updateSection("testimonials", { intro: event.target.value })} placeholder="See what customers say about this product." className={textareaClass()} /></Field>
        <div className="space-y-3">
          {(section("testimonials").items || []).map((item, index) => (
            <div key={item.id || index} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid gap-3 sm:grid-cols-[8rem,1fr]">
                <div>
                  <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">{item.imagePreviewUrl || item.image_url ? <img src={item.imagePreviewUrl || item.image_url} alt="Customer preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-400">Customer photo</div>}</div>
                  <label className="mt-2 block cursor-pointer rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-center text-xs font-semibold text-amber-900">Choose photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectTestimonialImage(index, event)} className="sr-only" /></label>
                </div>
                <div className="space-y-3"><Field label="Customer name"><input value={item.name || ""} onChange={(event) => updateItem("testimonials", "items", index, { name: event.target.value })} placeholder="Mr. Chinedu" className={inputClass()} /></Field><Field label="Testimonial"><textarea value={item.text || ""} onChange={(event) => updateItem("testimonials", "items", index, { text: event.target.value })} placeholder="Write the customer's experience." className={textareaClass()} /></Field><label className="inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={item.active !== false} onChange={(event) => updateItem("testimonials", "items", index, { active: event.target.checked })} /> Published</label></div>
              </div>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => moveItem("testimonials", "items", index, -1)} disabled={index === 0} className="rounded-lg border px-2 py-1 text-[11px] disabled:opacity-40">Move up</button><button type="button" onClick={() => moveItem("testimonials", "items", index, 1)} disabled={index === section("testimonials").items.length - 1} className="rounded-lg border px-2 py-1 text-[11px] disabled:opacity-40">Move down</button><button type="button" onClick={() => removeItem("testimonials", "items", index)} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700">Remove</button></div>
            </div>
          ))}
          <AddRemove addLabel="Add testimonial" onAdd={() => addItem("testimonials", "items", "testimonial", { active: true })} />
        </div>
      </Section>

      <Section title="Delivery and purchase information" help="Set expectations before someone orders. This does not change the existing checkout flow." enabled={!!section("delivery").enabled} onToggle={(enabled) => updateSection("delivery", { enabled })}>
        <Field label="Section heading"><input value={section("delivery").heading || ""} onChange={(event) => updateSection("delivery", { heading: event.target.value })} placeholder="Delivery and purchase information" className={inputClass()} /></Field>
        <Field label="Main message"><textarea value={section("delivery").body || ""} onChange={(event) => updateSection("delivery", { body: event.target.value })} placeholder="Tell customers what to expect before delivery." className={textareaClass()} /></Field>
        {renderItems("delivery", "points", [{ key: "title", label: "Important point", placeholder: "Confirm availability before dispatch" }], "delivery", "Add another point")}
      </Section>

      <Section title="Frequently asked questions" help="Add the questions customers ask most often about this product." enabled={!!section("faq").enabled} onToggle={(enabled) => updateSection("faq", { enabled })}>
        <Field label="Section heading"><input value={section("faq").heading || ""} onChange={(event) => updateSection("faq", { heading: event.target.value })} placeholder="Frequently asked questions" className={inputClass()} /></Field>
        {renderItems("faq", "items", [{ key: "question", label: "Question", placeholder: "Can it power my freezer?" }, { key: "answer", label: "Answer", placeholder: "Write a clear answer.", multiline: true }], "faq", "Add another FAQ")}
      </Section>

      <Section title="Final call to action" help="Close the page with a clear invitation to order." enabled={!!section("final_cta").enabled} onToggle={(enabled) => updateSection("final_cta", { enabled })}>
        <Field label="Heading"><input value={section("final_cta").heading || ""} onChange={(event) => updateSection("final_cta", { heading: event.target.value })} placeholder="Ready for reliable power?" className={inputClass()} /></Field>
        <Field label="Supporting text"><textarea value={section("final_cta").body || ""} onChange={(event) => updateSection("final_cta", { body: event.target.value })} placeholder="Choose your package and place your order today." className={textareaClass()} /></Field>
        <Field label="Button text"><input value={section("final_cta").label || ""} onChange={(event) => updateSection("final_cta", { label: event.target.value })} placeholder="Order now" className={inputClass()} /></Field>
      </Section>

      <Section title="Guarantee and warranty" help="Only publish warranty or guarantee information that Odinaka actually provides." enabled={!!section("guarantee").enabled} onToggle={(enabled) => updateSection("guarantee", { enabled })}>
        <Field label="Heading"><input value={section("guarantee").heading || ""} onChange={(event) => updateSection("guarantee", { heading: event.target.value })} placeholder="Warranty and after-sales support" className={inputClass()} /></Field>
        <Field label="Details"><textarea value={section("guarantee").body || ""} onChange={(event) => updateSection("guarantee", { body: event.target.value })} placeholder="Explain the warranty terms." className={textareaClass()} /></Field>
      </Section>

      <Section title="Shipping" help="Add product-specific shipping information when it differs from the normal store policy." enabled={!!section("shipping").enabled} onToggle={(enabled) => updateSection("shipping", { enabled })}>
        <Field label="Heading"><input value={section("shipping").heading || ""} onChange={(event) => updateSection("shipping", { heading: event.target.value })} placeholder="Shipping information" className={inputClass()} /></Field>
        <Field label="Details"><textarea value={section("shipping").body || ""} onChange={(event) => updateSection("shipping", { body: event.target.value })} placeholder="Explain delivery locations, timing, and charges." className={textareaClass()} /></Field>
      </Section>

      <Section title="Product-specific contact" help="Leave this off to use the normal Odinaka contact details." enabled={!!section("contact").enabled} onToggle={(enabled) => updateSection("contact", { enabled })}>
        <Field label="Heading"><input value={section("contact").heading || ""} onChange={(event) => updateSection("contact", { heading: event.target.value })} placeholder="Need help choosing a package?" className={inputClass()} /></Field>
        <Field label="Message"><textarea value={section("contact").body || ""} onChange={(event) => updateSection("contact", { body: event.target.value })} placeholder="Talk to our team before you order." className={textareaClass()} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone"><input value={section("contact").phone || ""} onChange={(event) => updateSection("contact", { phone: event.target.value })} placeholder="Leave blank for store phone" className={inputClass()} /></Field>
          <Field label="WhatsApp number"><input value={section("contact").whatsapp || ""} onChange={(event) => updateSection("contact", { whatsapp: event.target.value })} placeholder="Leave blank for store WhatsApp" className={inputClass()} /></Field>
        </div>
      </Section>
    </div>
  );
}
