/* eslint-disable @next/next/no-img-element -- the education image must keep its source aspect ratio without a fixed frame */
import Image from "next/image";
import ProductGallery from "@/components/shop/ProductGallery.client";
import BuyBar from "@/components/shop/BuyBar.client";
import UrgencyCountdown from "@/components/shop/UrgencyCountdown.client";
import PrimarySalesCta from "@/components/shop/PrimarySalesCta.client";
import ProductFaqAccordion from "@/components/shop/ProductFaqAccordion.client";
import ProductReviews from "@/components/shop/ProductReviews.server";
import { formatCurrency } from "@/lib/formatCurrency";
import { getVideoEmbedUrl } from "@/lib/videoEmbed";
import {
  hasRepeatableContent,
  hasText,
  normalizeSalesPageContent,
} from "@/lib/salesPage";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function Section({ children, className = "", dark = false, id, cta = true }) {
  return (
    <section id={id} className={cx(dark ? "bg-slate-950 text-white" : "bg-white", className)}>
      <div className="mx-auto w-full max-w-[1140px] px-4 py-12 sm:px-6 sm:py-16">{children}</div>
      {cta ? <div className="border-t border-slate-200/70 px-4 py-7 sm:px-6"><div className="mx-auto flex max-w-[1140px] justify-center"><PrimarySalesCta href="#purchase" /></div></div> : null}
    </section>
  );
}

function Heading({ eyebrow, title, children, dark = false, align = "center" }) {
  return (
    <div className={cx("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow ? <div className={cx("text-xs font-black uppercase tracking-[0.2em]", dark ? "text-white/80" : "text-[#374BA5]")}>{eyebrow}</div> : null}
      <h2 className={cx("mt-2 text-[clamp(1.9rem,4vw,3.25rem)] font-black leading-[1.08] tracking-tight", dark ? "text-white" : "text-slate-950")}>{title}</h2>
      {children ? <div className={cx("mt-4 text-base leading-7 sm:text-lg", dark ? "text-slate-300" : "text-slate-600")}>{children}</div> : null}
    </div>
  );
}

function ActionLink({ href, children, className = "" }) {
  return <a href={href} style={{ color: "#fff" }} className={cx("danger-shake inline-flex items-center justify-center rounded-full bg-red-600 px-7 py-3 text-center text-sm font-black uppercase text-white shadow-lg shadow-red-900/20 transition visited:text-white hover:bg-red-700 hover:text-white focus-visible:text-white active:text-white", className)}>{children}</a>;
}

function RepeatableCards({ items, className = "", render }) {
  const validItems = (items || []).filter((item) =>
    item && Object.entries(item).some(([key, value]) => key !== "id" && hasText(value)),
  );
  if (!validItems.length) return null;
  return <div className={cx("mt-8 grid gap-6", className)} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))" }}>{validItems.map((item, index) => render(item, index))}</div>;
}

function ProductMediaList({ imageUrl, imageAlt, items, note, summary, dark = false }) {
  const validItems = (items || []).filter((item) => hasText(item?.title || item?.name) || hasText(item?.description));
  if (!imageUrl && !validItems.length && !hasText(note) && !hasText(summary)) return null;

  return (
    <div className={cx("mt-8 grid items-center gap-8", imageUrl && "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12")}>
      {imageUrl ? <div className="mx-auto flex w-full max-w-xl items-center justify-center"><div className={cx("relative aspect-square w-full overflow-hidden rounded-2xl", dark ? "bg-white/10" : "bg-slate-50")}><Image src={imageUrl} alt={imageAlt || "Product"} fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-contain p-3 sm:p-5" /></div></div> : null}
      <div className={cx(!imageUrl && "mx-auto w-full max-w-3xl")}>
        {validItems.length ? <ul className={cx("divide-y", dark ? "divide-white/20" : "divide-slate-200")}>{validItems.map((item, index) => <li key={item.id || `${item.title || item.name}-${index}`} className="flex gap-3 py-4 first:pt-0"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">✓</span><div><div className={cx("font-black", dark ? "text-white" : "text-slate-950")}>{item.title || item.name}</div>{item.description ? <p className={cx("mt-1 text-sm leading-6", dark ? "text-blue-100" : "text-slate-600")}>{item.description}</p> : null}</div></li>)}</ul> : null}
        {hasText(note) ? <p className={cx("mt-5 text-sm leading-6", dark ? "text-blue-100" : "text-slate-600")}>{note}</p> : null}
        {hasText(summary) ? <div className={cx("mt-6 border-t pt-5 text-lg font-black leading-7", dark ? "border-white/30 text-white" : "border-slate-300 text-[#374BA5]")}>{summary}</div> : null}
      </div>
    </div>
  );
}

function FormattedInlineText({ value }) {
  return String(value || "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} className="font-black text-slate-950">{part.slice(2, -2)}</strong>
      : <span key={index}>{part}</span>,
  );
}

function FormattedContent({ value }) {
  const blocks = String(value || "").trim().split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    const isList = lines.every((line) => line.trim().startsWith("- "));
    if (isList) {
      return <ul key={`list-${blockIndex}`} className="space-y-2 pl-1 text-base leading-8 text-slate-700 sm:text-lg">{lines.map((line, lineIndex) => <li key={lineIndex} className="flex gap-3"><span aria-hidden="true" className="text-[#374BA5]">•</span><span><FormattedInlineText value={line.trim().slice(2)} /></span></li>)}</ul>;
    }
    return <p key={`paragraph-${blockIndex}`} className="whitespace-pre-line text-base leading-8 text-slate-700 sm:text-lg"><FormattedInlineText value={block} /></p>;
  });
}

function FooterInfoColumn({ heading, body }) {
  if (!hasText(heading) && !hasText(body)) return null;
  return (
    <div className="min-w-0">
      {hasText(heading) ? <h2 className="text-xl font-black text-white">{heading}</h2> : null}
      {hasText(body) ? <div className="mt-3 space-y-3 [&_li>span:first-child]:!text-emerald-300 [&_p]:!text-sm [&_p]:!leading-7 [&_p]:!text-slate-100 [&_strong]:!text-white [&_ul]:!text-sm [&_ul]:!leading-7 [&_ul]:!text-slate-100"><FormattedContent value={body} /></div> : null}
    </div>
  );
}

function VideoBlock({ embeds, content }) {
  if (!embeds.length) return null;
  const video = content.video || {};
  const gridWidth = embeds.length === 1 ? "max-w-4xl" : embeds.length === 2 ? "max-w-5xl" : "max-w-6xl";
  return (
    <Section dark className="border-0 !bg-[#374BA5]">
      {hasText(video.heading) ? <Heading dark title={video.heading} /> : null}
      <div className={cx("mx-auto grid items-start gap-6", hasText(video.heading) ? "mt-8" : "", gridWidth)} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))" }}>{embeds.map(({ embed, item }, index) => <article key={item.id || index} className={cx("mx-auto w-full", embed.aspectRatio === "9 / 16" ? "max-w-sm" : "max-w-4xl")}><div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl" style={{ aspectRatio: embed.aspectRatio }}><iframe src={embed.url} title={item.title || `Customer testimonial video ${index + 1}`} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>{item.title ? <h3 className="mt-3 font-black text-white">{item.title}</h3> : null}</article>)}</div>
    </Section>
  );
}

function ManualTestimonials({ content }) {
  const testimonials = content.testimonials || {};
  const items = (testimonials.items || []).filter((item) => item.active !== false && hasText(item.text));
  if (!testimonials.enabled || !items.length) return null;
  return <Section>{hasText(testimonials.heading) || hasText(testimonials.intro) ? <Heading title={testimonials.heading}>{testimonials.intro}</Heading> : null}<div className={cx("grid gap-6", hasText(testimonials.heading) || hasText(testimonials.intro) ? "mt-8" : "")} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))" }}>{items.map((item, index) => <article key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">{item.image_url ? <Image src={item.image_url} alt={item.name || "Odinaka Solar customer"} width={96} height={96} className="mx-auto h-20 w-20 rounded-full object-cover" /> : null}<p className="mt-5 whitespace-pre-line text-center text-base leading-7 text-slate-700">“{item.text}”</p>{item.name ? <div className="mt-5 text-center font-black text-[#374BA5]">— {item.name}</div> : null}</article>)}</div></Section>;
}

function CustomerReviews({ reviews, productId }) {
  return (
    <Section cta={false} className="bg-slate-50">
      <div className="mx-auto max-w-4xl"><Heading title="Customer reviews" />
      {reviews.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{reviews.map((review) => <article key={review.id} className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="font-bold text-slate-950">{review.display_name || "Customer"}</div><div className="text-sm text-amber-600" aria-label={`${review.rating || 5} out of 5 stars`}>{"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 5))))}</div></div><p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{review.content}</p>{review.image_url ? <Image src={review.image_url} alt={`${review.display_name || "Customer"}'s review`} width={320} height={240} className="mt-4 max-h-52 w-full rounded-2xl object-cover" /> : null}</article>)}</div> : null}
      <div className="mx-auto mt-8 max-w-2xl"><ProductReviews productId={productId} reviews={[]} /></div></div>
    </Section>
  );
}

export default function ProductSalesPage({ product, waLink, videoEmbed, approvedReviews, packages, capabilities, salesPageContent, salesPageIsActive = false }) {
  const content = normalizeSalesPageContent(salesPageContent);
  const configuredVideos = (content.video.videos || []).filter((item) => item.active !== false && hasText(item.url)).map((item) => ({ item, embed: getVideoEmbedUrl(item.url, item.platform) })).filter((item) => item.embed);
  const testimonialVideoEmbeds = configuredVideos.length ? configuredVideos : videoEmbed ? [{ item: { id: "legacy-video" }, embed: videoEmbed }] : [];
  const configuredPowerItems = (content.capabilities.items || []).filter((item) => hasText(item?.name) || hasText(item?.description));
  const powerItems = configuredPowerItems.length ? configuredPowerItems : capabilities.map((item) => ({ id: item.id, name: item.name, description: "" }));
  const hero = content.hero;
  const urgency = content.urgency;
  const hasUrgency = urgency.enabled && (hasText(urgency.units_left) || hasText(urgency.message) || hasText(urgency.promo_message));
  const hasBonuses = content.bonuses.enabled && (hasText(content.bonuses.heading) || hasText(content.bonuses.intro) || hasText(content.bonuses.image_url) || hasText(content.bonuses.note) || hasText(content.bonuses.progress_text) || hasText(content.bonuses.progress_percent) || hasRepeatableContent(content.bonuses.items));
  const hasProblem = content.problem.enabled && (hasText(content.problem.image_url) || hasText(content.problem.content));
  const hasBenefits = content.benefits.enabled && (hasText(content.benefits.heading) || hasText(content.benefits.content));
  const legacyEducationContent = [
    content.education.intro,
    ...(content.education.blocks || []).flatMap((item) => [item.title || item.name, item.body || item.description].filter(hasText)),
  ].filter(hasText).join("\n\n");
  const educationContent = hasText(content.education.content) ? content.education.content : legacyEducationContent;
  const hasEducation = content.education.enabled && (hasText(content.education.heading) || hasText(content.education.image_url) || hasText(educationContent) || hasText(content.education.button_text));
  const hasSteps = content.how_it_works.enabled && (hasText(content.how_it_works.heading) || hasRepeatableContent(content.how_it_works.steps));
  const packageContent = content.packages || {};
  const packageHeading = packageContent.enabled && hasText(packageContent.heading) ? packageContent.heading : "Choose your package";
  const packageIntro = packageContent.enabled && hasText(packageContent.intro) ? packageContent.intro : "";
  const legacyDeliveryContent = [
    content.delivery.body,
    ...(content.delivery.points || []).map((item) => item.title || item.name).filter(hasText).map((item) => `- ${item}`),
  ].filter(hasText).join("\n\n");
  const deliveryContent = hasText(content.delivery.content) ? content.delivery.content : legacyDeliveryContent;
  const hasDelivery = content.delivery.enabled && (hasText(content.delivery.heading) || hasText(deliveryContent) || hasText(content.delivery.button_text) || hasText(content.delivery.text_below));
  const hasFaq = content.faq.enabled && (hasText(content.faq.heading) || hasRepeatableContent(content.faq.items));
  const hasFinalCta = content.final_cta.enabled && (hasText(content.final_cta.heading) || hasText(content.final_cta.body));
  const hasGuarantee = content.guarantee.enabled && (hasText(content.guarantee.heading) || hasText(content.guarantee.body));
  const hasShipping = content.shipping.enabled && (hasText(content.shipping.heading) || hasText(content.shipping.body));
  const hasContact = content.contact.enabled && (hasText(content.contact.number_heading) || hasText(content.contact.heading) || hasText(content.contact.body) || hasText(content.contact.phone) || hasText(content.contact.whatsapp));
  const contactNumber = content.contact.phone || content.contact.whatsapp;
  const hasFooterColumns = hasGuarantee || hasShipping || (hasContact && (hasText(content.contact.heading) || hasText(content.contact.body)));
  const productFaqs = hasFaq
    ? (content.faq.items || []).filter((item) => hasText(item.question) && hasText(item.answer))
    : [
        { id: "availability", question: `Is ${product.name} available in Nigeria?`, answer: product.in_stock === false ? "Please contact Odinaka Solar Tech to confirm restock timing." : `Yes, ${product.name} is currently available from Odinaka Solar Tech in Nigeria.` },
        { id: "price", question: `How much is ${product.name}?`, answer: packages.length ? "Choose a package above to see its current price." : product.price != null ? `${formatCurrency(product.price)}.` : "Please contact us to confirm the current price." },
        { id: "order", question: `How can I order ${product.name}?`, answer: "Use the order options on this page, or contact Odinaka Solar Tech through WhatsApp." },
      ];

  return (
    <div className="-mx-4 sm:-mx-6">
      {hasUrgency ? (
        <section className="sticky top-16 z-40 mx-auto max-w-[1140px] px-4 pt-2 sm:px-6">
          <div className="rounded-lg border-2 border-red-600 bg-white px-4 py-3 text-center shadow-[0_5px_20px_rgba(0,0,0,0.12)] sm:flex sm:items-center sm:justify-center sm:gap-6">
            {hasText(urgency.units_left) ? <UrgencyCountdown productId={product.id} unitsLeft={urgency.units_left} /> : null}
            <div className="mt-3 sm:mt-0">{hasText(urgency.message) ? <div className="text-lg font-black uppercase text-red-600">{urgency.message}</div> : null}{hasText(urgency.promo_message) ? <div className="mt-1 text-sm font-semibold text-slate-700">{urgency.promo_message}</div> : null}{hasText(urgency.deadline) ? <div className="mt-1 text-xs font-bold text-red-700">Available until {urgency.deadline}</div> : null}</div>
            <ActionLink href="#purchase" className="mt-4 sm:mt-0">{hero.cta_label || "Order now"}</ActionLink>
          </div>
        </section>
      ) : null}

      <Section className="border-0 bg-white">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">{hero.enabled && hasText(hero.eyebrow) ? hero.eyebrow : product.category?.name || "Odinaka Solar Tech"}</div>
            <h1 className="mt-4 text-[clamp(2.25rem,5vw,4.25rem)] font-black leading-[1.02] tracking-tight text-slate-950">{hero.enabled && hasText(hero.headline) ? hero.headline : product.name}</h1>
            {(hero.enabled && hasText(hero.subheadline)) || hasText(product.short_description) ? <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">{hero.enabled && hasText(hero.subheadline) ? hero.subheadline : product.short_description}</p> : null}
            {hero.enabled && hasText(hero.promise) ? <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-900">{hero.promise}</p> : null}
            <div className="mt-5 text-2xl font-black text-amber-700">{packages.length ? `From ${formatCurrency(Math.min(...packages.map((item) => Number(item.price))))}` : product.price != null ? formatCurrency(product.price) : "Request price"}</div>
            <div className="mt-7 flex flex-wrap items-center gap-3"><a href="#details" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800">See product details</a></div>
            {product.in_stock === false ? <div className="mt-4 text-sm font-semibold text-red-700">Currently out of stock. Contact us to confirm availability.</div> : <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Available from Odinaka Solar Tech in Nigeria</div>}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xl"><ProductGallery images={product.images || []} name={product.name} /></div>
        </div>
      </Section>

      {!salesPageIsActive && hasText(product.description) ? <Section><Heading title={`${product.name} overview`}><div className="whitespace-pre-line">{product.description}</div></Heading></Section> : null}

      <VideoBlock embeds={testimonialVideoEmbeds} content={content} />

      {hasBonuses ? <Section>{hasText(content.bonuses.heading) || hasText(content.bonuses.intro) ? <Heading title={content.bonuses.heading}>{content.bonuses.intro}</Heading> : null}{hasText(content.bonuses.progress_text) || hasText(content.bonuses.progress_percent) ? <div className="mx-auto mt-7 max-w-3xl"><div className="flex items-center justify-between gap-4 text-sm font-bold text-slate-700"><span>{content.bonuses.progress_text}</span>{hasText(content.bonuses.progress_percent) ? <span>{Math.max(0, Math.min(100, Number(content.bonuses.progress_percent) || 0))}%</span> : null}</div>{hasText(content.bonuses.progress_percent) ? <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-red-600" style={{ width: `${Math.max(0, Math.min(100, Number(content.bonuses.progress_percent) || 0))}%` }} /></div> : null}</div> : null}<ProductMediaList imageUrl={content.bonuses.image_url} imageAlt={content.bonuses.heading || product.name} items={content.bonuses.items} note={content.bonuses.note} /></Section> : null}

      {hasProblem ? <Section cta={false}><div className={cx("grid items-center gap-8 lg:gap-12", hasText(content.problem.image_url) && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
        {hasText(content.problem.image_url) ? <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-slate-50"><Image src={content.problem.image_url} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-3 sm:p-5" /></div> : null}
        <div className={cx("space-y-5", !hasText(content.problem.image_url) && "mx-auto w-full max-w-3xl")}><FormattedContent value={content.problem.content} />{hasText(content.problem.button_text) ? <div className="pt-2"><PrimarySalesCta href="#purchase" label={content.problem.button_text} /></div> : null}</div>
      </div></Section> : null}

      {powerItems.length || hasText(content.capabilities.image_url) || hasText(content.capabilities.summary) ? <Section id="details" dark className="!bg-[#374BA5]">{hasText(content.capabilities.heading) ? <Heading dark title={content.capabilities.heading} /> : null}<ProductMediaList dark imageUrl={content.capabilities.image_url} imageAlt={content.capabilities.heading || product.name} items={powerItems} summary={content.capabilities.summary} /></Section> : null}

      {hasBenefits ? <Section>{hasText(content.benefits.heading) ? <Heading title={content.benefits.heading} /> : null}<div className={cx("mx-auto max-w-3xl space-y-5", hasText(content.benefits.heading) && "mt-8")}><FormattedContent value={content.benefits.content} /></div></Section> : null}

      {hasEducation ? <Section cta={false}>
        {hasText(content.education.heading) ? <Heading title={content.education.heading} /> : null}
        {hasText(content.education.image_url) ? <div className="mx-auto mt-8 w-full max-w-4xl"><img src={content.education.image_url} alt={content.education.heading || product.name} loading="lazy" decoding="async" className="mx-auto block h-auto max-w-full" /></div> : null}
        {hasText(educationContent) ? <div className="mx-auto mt-8 max-w-3xl space-y-5"><FormattedContent value={educationContent} /></div> : null}
        {hasText(content.education.button_text) ? <div className="mt-8 flex justify-center"><PrimarySalesCta href="#purchase" label={content.education.button_text} /></div> : null}
      </Section> : null}

      {product.specs ? <Section><Heading title={`${product.name} specifications`} /><dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(product.specs).map(([key, value]) => <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{key.replace(/_/g, " ")}</dt><dd className="mt-2 font-bold text-slate-950">{String(value)}</dd></div>)}</dl></Section> : null}

      <ManualTestimonials content={content} />

      {hasSteps ? <Section><Heading title={content.how_it_works.heading} /><div className="mt-8 grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))" }}>{(content.how_it_works.steps || []).filter((item) => item && (hasText(item.title) || hasText(item.body))).map((item, index) => <article key={item.id || index} className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#374BA5] text-lg font-black text-white shadow-lg">{index + 1}</div><h3 className="mt-4 text-lg font-black text-slate-950">{item.title || item.name}</h3>{item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}</article>)}</div></Section> : null}

      <Section id="purchase" className="bg-white"><Heading title={packages.length ? packageHeading : product.name}>{packages.length ? packageIntro : null}</Heading><div className="mt-8"><BuyBar product={{ ...product, packages }} waLink={waLink} /></div></Section>

      {hasDelivery ? <Section cta={false}>
        {hasText(content.delivery.heading) ? <div className="text-center"><h2 className="text-[clamp(1.9rem,4vw,3.25rem)] font-black leading-[1.08] tracking-tight text-red-600">{content.delivery.heading}</h2></div> : null}
        {hasText(deliveryContent) ? <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-slate-950 px-5 py-7 text-white shadow-xl sm:px-9 sm:py-9"><div className="space-y-5 [&_p]:!text-white [&_strong]:!text-white [&_ul]:!text-white [&_li>span:first-child]:!text-amber-400"><FormattedContent value={deliveryContent} /></div></div> : null}
        {hasText(content.delivery.button_text) ? <div className="mt-7 flex justify-center"><PrimarySalesCta href="#purchase" label={content.delivery.button_text} /></div> : null}
        {hasText(content.delivery.text_below) ? <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-bold uppercase tracking-wide text-slate-700">{content.delivery.text_below}</p> : null}
      </Section> : null}

      {productFaqs.length ? <Section><Heading title={hasFaq && hasText(content.faq.heading) ? content.faq.heading : "Frequently asked questions"} /><ProductFaqAccordion items={productFaqs} /></Section> : null}

      {hasFinalCta ? <Section dark><div className="text-center"><Heading dark title={content.final_cta.heading}>{content.final_cta.body}</Heading></div></Section> : null}
      {hasGuarantee || hasShipping || hasContact ? <Section dark cta={false} className="!bg-black">
        {hasContact && (hasText(content.contact.number_heading) || hasText(contactNumber)) ? <div className="text-center">
          {hasText(content.contact.number_heading) ? <div className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">{content.contact.number_heading}</div> : null}
          {hasText(contactNumber) ? <a href={`tel:${contactNumber}`} className="mt-2 inline-block text-2xl font-black tracking-tight text-white transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-4 focus-visible:ring-offset-black sm:text-3xl">{contactNumber}</a> : null}
        </div> : null}
        {hasFooterColumns ? <div className={cx("grid gap-8 md:grid-cols-3 md:gap-10", hasContact && (hasText(content.contact.number_heading) || hasText(contactNumber)) && "mt-9 border-t border-white/20 pt-9")}>
          {hasGuarantee ? <FooterInfoColumn heading={content.guarantee.heading} body={content.guarantee.body} /> : null}
          {hasShipping ? <FooterInfoColumn heading={content.shipping.heading} body={content.shipping.body} /> : null}
          {hasContact ? <FooterInfoColumn heading={content.contact.heading} body={content.contact.body} /> : null}
        </div> : null}
      </Section> : null}
      <CustomerReviews reviews={approvedReviews} productId={product.id} />
    </div>
  );
}
