import Image from "next/image";
import ProductGallery from "@/components/shop/ProductGallery.client";
import BuyBar from "@/components/shop/BuyBar.client";
import UrgencyCountdown from "@/components/shop/UrgencyCountdown.client";
import PrimarySalesCta from "@/components/shop/PrimarySalesCta.client";
import ProductReviews from "@/components/shop/ProductReviews.server";
import { formatCurrency } from "@/lib/formatCurrency";
import { whatsappLink } from "@/lib/whatsapp";
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
    <section id={id} className={cx("border-t border-slate-200", dark ? "bg-slate-950 text-white" : "bg-white", className)}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">{children}</div>
      {cta ? <div className="border-t border-orange-100/80 px-4 py-8 sm:px-6"><div className="mx-auto flex justify-center"><PrimarySalesCta href="#purchase" /></div></div> : null}
    </section>
  );
}

function Heading({ eyebrow, title, children, dark = false }) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <div className={cx("text-xs font-black uppercase tracking-[0.2em]", dark ? "text-amber-300" : "text-amber-700")}>{eyebrow}</div> : null}
      <h2 className={cx("mt-2 text-3xl font-black tracking-tight sm:text-5xl", dark ? "text-white" : "text-slate-950")}>{title}</h2>
      {children ? <div className={cx("mt-4 text-base leading-7 sm:text-lg", dark ? "text-slate-300" : "text-slate-600")}>{children}</div> : null}
    </div>
  );
}

function ActionLink({ href, children, className = "" }) {
  return <a href={href} className={cx("danger-shake inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400", className)}>{children}</a>;
}

function RepeatableCards({ items, className = "", render }) {
  const validItems = (items || []).filter((item) =>
    item && Object.entries(item).some(([key, value]) => key !== "id" && hasText(value)),
  );
  if (!validItems.length) return null;
  return <div className={cx("mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>{validItems.map((item, index) => render(item, index))}</div>;
}

function VideoBlock({ embeds, content }) {
  if (!embeds.length) return null;
  const video = content.video || {};
  return (
    <Section dark className="border-0">
      <Heading dark title={video.heading || "Client video testimonial"}>
        {video.caption || "Hear how this product is helping a real customer."}
      </Heading>
      <div className="mt-8 grid items-start gap-6 md:grid-cols-2">{embeds.map(({ embed, item }, index) => <article key={item.id || index} className={cx("mx-auto w-full", embed.aspectRatio === "9 / 16" ? "max-w-sm" : "max-w-2xl")}><div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl" style={{ aspectRatio: embed.aspectRatio }}><iframe src={embed.url} title={item.title || `Customer testimonial video ${index + 1}`} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>{item.title ? <h3 className="mt-3 font-black text-white">{item.title}</h3> : null}{item.description ? <p className="mt-1 text-sm text-slate-300">{item.description}</p> : null}</article>)}</div>
    </Section>
  );
}

function ManualTestimonials({ content }) {
  const testimonials = content.testimonials || {};
  const items = (testimonials.items || []).filter((item) => item.active !== false && hasText(item.text));
  if (!testimonials.enabled || !items.length) return null;
  return <Section className="bg-amber-50/60"><Heading eyebrow="Customer experiences" title={testimonials.heading || "What our customers say"}>{testimonials.intro}</Heading><div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4">{items.map((item, index) => <article key={item.id || index} className="min-w-[85%] snap-start rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:min-w-[22rem] lg:min-w-[calc(33.333%-0.75rem)]">{item.image_url ? <Image src={item.image_url} alt={item.name || "Odinaka Solar customer"} width={96} height={96} className="h-20 w-20 rounded-full object-cover" /> : null}<p className="mt-5 whitespace-pre-line text-base leading-7 text-slate-700">“{item.text}”</p><div className="mt-5 font-black text-slate-950">— {item.name || "Customer"}</div></article>)}</div></Section>;
}

function CustomerReviews({ reviews, productId }) {
  return (
    <Section cta={false} className="bg-slate-50">
      <div className="mx-auto max-w-4xl"><Heading title="Customer reviews">Verified customer feedback and a simple way to share your experience.</Heading>
      {reviews.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{reviews.map((review) => <article key={review.id} className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="font-bold text-slate-950">{review.display_name || "Customer"}</div><div className="text-sm text-amber-600" aria-label={`${review.rating || 5} out of 5 stars`}>{"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 5))))}</div></div><p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{review.content}</p>{review.image_url ? <Image src={review.image_url} alt={`${review.display_name || "Customer"}'s review`} width={320} height={240} className="mt-4 max-h-52 w-full rounded-2xl object-cover" /> : null}</article>)}</div> : null}
      <div className="mx-auto mt-8 max-w-2xl"><ProductReviews productId={productId} reviews={[]} /></div></div>
    </Section>
  );
}

export default function ProductSalesPage({ product, waLink, videoEmbed, approvedReviews, packages, capabilities, salesPageContent, salesPageIsActive = false }) {
  const content = normalizeSalesPageContent(salesPageContent);
  const configuredVideos = (content.video.videos || []).filter((item) => item.active !== false && hasText(item.url)).map((item) => ({ item, embed: getVideoEmbedUrl(item.url, item.platform) })).filter((item) => item.embed);
  const testimonialVideoEmbeds = configuredVideos.length ? configuredVideos : videoEmbed ? [{ item: { id: "legacy-video" }, embed: videoEmbed }] : [];
  const capabilityVideoEmbed = getVideoEmbedUrl(content.capabilities.video_url, content.capabilities.video_platform);
  const hero = content.hero;
  const urgency = content.urgency;
  const hasUrgency = urgency.enabled && (hasText(urgency.units_left) || hasText(urgency.message) || hasText(urgency.promo_message));
  const hasBonuses = content.bonuses.enabled && (hasText(content.bonuses.heading) || hasText(content.bonuses.intro) || hasRepeatableContent(content.bonuses.items));
  const hasProblem = content.problem.enabled && (hasText(content.problem.heading) || hasText(content.problem.body) || hasRepeatableContent(content.problem.points));
  const hasBenefits = content.benefits.enabled && (hasText(content.benefits.heading) || hasText(content.benefits.intro) || hasRepeatableContent(content.benefits.items));
  const hasEducation = content.education.enabled && (hasText(content.education.heading) || hasText(content.education.intro) || hasRepeatableContent(content.education.blocks));
  const hasSteps = content.how_it_works.enabled && (hasText(content.how_it_works.heading) || hasRepeatableContent(content.how_it_works.steps));
  const packageContent = content.packages || {};
  const packageEyebrow = packageContent.enabled && hasText(packageContent.eyebrow) ? packageContent.eyebrow : "Choose your package";
  const packageHeading = packageContent.enabled && hasText(packageContent.heading) ? packageContent.heading : "Choose your package";
  const packageIntro = packageContent.enabled && hasText(packageContent.intro) ? packageContent.intro : "Select the package that's right for you.";
  const hasDelivery = content.delivery.enabled && (hasText(content.delivery.heading) || hasText(content.delivery.body) || hasRepeatableContent(content.delivery.points));
  const hasFaq = content.faq.enabled && (hasText(content.faq.heading) || hasRepeatableContent(content.faq.items));
  const hasFinalCta = content.final_cta.enabled && (hasText(content.final_cta.heading) || hasText(content.final_cta.body));
  const hasGuarantee = content.guarantee.enabled && (hasText(content.guarantee.heading) || hasText(content.guarantee.body));
  const hasShipping = content.shipping.enabled && (hasText(content.shipping.heading) || hasText(content.shipping.body));
  const hasContact = content.contact.enabled && (hasText(content.contact.heading) || hasText(content.contact.body) || hasText(content.contact.phone) || hasText(content.contact.whatsapp));
  const customContactLink = hasText(content.contact.whatsapp)
    ? whatsappLink({ phone: content.contact.whatsapp, message: `Hello, I want to buy ${product.name}.` })
    : waLink;

  return (
    <div className="-mx-4 sm:-mx-6">
      {hasUrgency ? (
        <section className="mx-auto max-w-6xl px-4 pt-2 sm:px-6">
          <div className="rounded-3xl border-2 border-red-500 bg-red-50 px-4 py-5 text-center shadow-sm sm:flex sm:items-center sm:justify-center sm:gap-6">
            {hasText(urgency.units_left) ? <UrgencyCountdown productId={product.id} unitsLeft={urgency.units_left} /> : null}
            <div className="mt-3 sm:mt-0"><div className="text-lg font-black uppercase text-red-600">{urgency.message || "Offer closing soon"}</div>{hasText(urgency.promo_message) ? <div className="mt-1 text-sm font-semibold text-slate-700">{urgency.promo_message}</div> : null}{hasText(urgency.deadline) ? <div className="mt-1 text-xs font-bold text-red-700">Available until {urgency.deadline}</div> : null}</div>
            <ActionLink href="#purchase" className="mt-4 sm:mt-0">{hero.cta_label || "Get this offer"}</ActionLink>
          </div>
        </section>
      ) : null}

      <Section className="border-0 bg-slate-50">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">{hero.enabled && hasText(hero.eyebrow) ? hero.eyebrow : product.category?.name || "Odinaka Solar Tech"}</div>
            <h1 className="mt-4 text-4xl font-black leading-[1.03] tracking-tight text-slate-950 sm:text-6xl">{hero.enabled && hasText(hero.headline) ? hero.headline : product.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">{hero.enabled && hasText(hero.subheadline) ? hero.subheadline : product.short_description || "Reliable solar power for homes, shops, offices, and everyday life."}</p>
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

      {hasBonuses ? <Section><Heading eyebrow="Your complete offer" title={content.bonuses.heading}>{content.bonuses.intro}</Heading><RepeatableCards items={content.bonuses.items} render={(item, index) => <article key={item.id || index} className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="text-xs font-black uppercase tracking-widest text-amber-700">Bonus {index + 1}</div><h3 className="mt-2 text-xl font-black text-slate-950">{item.title || item.name}</h3>{item.description ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p> : null}{item.value ? <div className="mt-4 font-black text-amber-700">{item.value}</div> : null}</article>} /></Section> : null}

      {hasProblem ? <Section dark><Heading dark eyebrow={content.problem.eyebrow} title={content.problem.heading}>{content.problem.body}</Heading><RepeatableCards items={content.problem.points} className="lg:grid-cols-2" render={(item, index) => <article key={item.id || index} className="rounded-3xl border border-white/10 bg-white/10 p-5"><h3 className="text-lg font-black text-white">{item.title || item.name}</h3>{item.description ? <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p> : null}</article>} /></Section> : null}

      {capabilities.length || capabilityVideoEmbed ? <Section id="details" className="bg-white"><Heading eyebrow="See what it can handle" title={content.capabilities.heading || "What can it power?"}>{content.capabilities.intro}</Heading>{capabilities.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{capabilities.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 shadow-sm">✓ {item.name}</div>)}</div> : null}{capabilityVideoEmbed ? <div className={cx("mx-auto mt-8 w-full", capabilityVideoEmbed.aspectRatio === "9 / 16" ? "max-w-sm" : "max-w-2xl")}><div className="overflow-hidden rounded-3xl bg-black shadow-xl" style={{ aspectRatio: capabilityVideoEmbed.aspectRatio }}><iframe src={capabilityVideoEmbed.url} title="What this solar system can power" className="h-full w-full" loading="lazy" allowFullScreen /></div></div> : null}</Section> : null}

      {hasBenefits ? <Section className="bg-amber-50"><Heading title={content.benefits.heading}>{content.benefits.intro}</Heading><RepeatableCards items={content.benefits.items} render={(item, index) => <article key={item.id || index} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100"><h3 className="text-lg font-black text-slate-950">{item.title || item.name}</h3>{item.description ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p> : null}</article>} /></Section> : null}

      {hasEducation ? <Section><Heading title={content.education.heading}>{content.education.intro}</Heading><RepeatableCards items={content.education.blocks} className="lg:grid-cols-2" render={(item, index) => <article key={item.id || index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-black text-slate-950">{item.title || item.name}</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{item.body || item.description}</p></article>} /></Section> : null}

      {product.specs ? <Section><Heading title={`${product.name} specifications`} /><dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(product.specs).map(([key, value]) => <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-500">{key.replace(/_/g, " ")}</dt><dd className="mt-2 font-bold text-slate-950">{String(value)}</dd></div>)}</dl></Section> : null}

      <ManualTestimonials content={content} />

      {hasSteps ? <Section><Heading eyebrow="Simple purchase journey" title={content.how_it_works.heading} /><div className="mt-8 grid gap-4 md:grid-cols-3">{(content.how_it_works.steps || []).filter((item) => item && (hasText(item.title) || hasText(item.body))).map((item, index) => <article key={item.id || index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-amber-400">{index + 1}</div><h3 className="mt-5 text-xl font-black text-slate-950">{item.title || item.name}</h3>{item.body ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.body}</p> : null}</article>)}</div></Section> : null}

      <Section id="purchase" className="bg-slate-50"><div className="mx-auto max-w-3xl"><Heading eyebrow={packages.length ? packageEyebrow : "Order this product"} title={packages.length ? packageHeading : product.name}>{packages.length ? packageIntro : null}</Heading><div className="mt-8"><BuyBar product={{ ...product, packages }} waLink={waLink} /></div></div></Section>

      {hasDelivery ? <Section><Heading title={content.delivery.heading}>{content.delivery.body}</Heading><RepeatableCards items={content.delivery.points} className="lg:grid-cols-3" render={(item, index) => <div key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-700">✓ {item.title || item.name}</div>} /></Section> : null}

      <Section><Heading title={hasFaq ? content.faq.heading : "Frequently asked questions"} /><div className="mt-8 space-y-3">{hasFaq ? (content.faq.items || []).filter((item) => hasText(item.question) || hasText(item.answer)).map((item, index) => <details key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-black text-slate-950">{item.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{item.answer}</p></details>) : null}<details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-black text-slate-950">Is {product.name} available in Nigeria?</summary><p className="mt-3 text-sm leading-7 text-slate-700">{product.in_stock === false ? `Please contact Odinaka Solar Tech to confirm restock timing.` : `Yes, ${product.name} is currently available from Odinaka Solar Tech in Nigeria.`}</p></details><details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-black text-slate-950">How much is {product.name}?</summary><p className="mt-3 text-sm leading-7 text-slate-700">{packages.length ? "Choose a package above to see its current price." : product.price != null ? `${formatCurrency(product.price)}.` : "Please contact us to confirm the current price."}</p></details><details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-black text-slate-950">How can I order {product.name}?</summary><p className="mt-3 text-sm leading-7 text-slate-700">Use the order options on this page, or contact Odinaka Solar Tech through WhatsApp.</p></details></div></Section>

      {hasFinalCta ? <Section dark><div className="text-center"><Heading dark title={content.final_cta.heading}>{content.final_cta.body}</Heading></div></Section> : null}
      {hasGuarantee ? <Section className="bg-amber-50"><Heading title={content.guarantee.heading}>{content.guarantee.body}</Heading></Section> : null}
      {hasShipping ? <Section><Heading title={content.shipping.heading}>{content.shipping.body}</Heading></Section> : null}
      {hasContact ? <Section className="bg-slate-50"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><Heading title={content.contact.heading}>{content.contact.body}</Heading><div className="flex flex-wrap gap-3">{hasText(content.contact.phone) ? <a href={`tel:${content.contact.phone}`} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">Call {content.contact.phone}</a> : null}<ActionLink href={customContactLink}>WhatsApp us</ActionLink></div></div></Section> : null}
      <CustomerReviews reviews={approvedReviews} productId={product.id} />
    </div>
  );
}
