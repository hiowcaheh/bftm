import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{n as t,t as n}from"./jsx-runtime-CIxEorsV.js";import{s as r,t as i}from"./queryKeys-BmVcX7v4.js";import{t as a}from"./arrow-left-DKX8kQa1.js";import{t as o}from"./copy-Cm07qmLQ.js";import{t as s}from"./pencil-BNPnAkGm.js";import{t as c}from"./send-DypXVUaq.js";import{n as l,t as u}from"./Dialog-DhFmoej_.js";import{c as d}from"./context-Bjun1a86.js";import{S as ee,W as te,X as f,Y as p,h as m,ht as h,lt as g,r as _,tt as v,u as y,y as b}from"./index-BXKh7ZWs.js";import{n as x}from"./Input-BTMzJ1ds.js";import{t as S}from"./Badge-Byieagxp.js";import{t as C}from"./Card-C6EivnOT.js";import{t as w}from"./Sheet-6bJBAjme.js";import{t as T}from"./hooks-Dkls-YtO.js";import{_ as E,c as D,d as O,i as k,p as ne,s as A}from"./hooks-BVQ-JTp7.js";var j=e(t(),1),M=`#1E2A44`,N=`#CC0000`;function P(e){return e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function F(e){return`Visualisering — ${e.trim()||`ditt projekt`}`}function I(e){let t=P(e.clientName.trim()||`kund`),n=P(e.vizTitle.trim()||`ditt projekt`),r=P(e.companyName.trim()||`BFTM Fasad & Bygg AB`),i=encodeURI(e.url),a=P(e.url),o=new Date().getFullYear();return`<!doctype html>
<html lang="sv">
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:20px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06);">

        <tr><td style="background:${M};padding:32px 28px 28px;">${e.logoUrl?`<img src="${encodeURI(e.logoUrl)}" alt="${r}" style="max-width:260px;width:100%;height:auto;display:block;margin:0 auto;" />`:`<div style="color:#ffffff;font-size:22px;font-weight:700;text-align:center;letter-spacing:.5px;">${r}</div>`}</td></tr>

        <tr><td style="background:${N};padding:14px 28px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">Visualisering: ${n}</div>
        </td></tr>

        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;">Hej <strong>${t}</strong>!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">Vi har förberett en visualisering av arbetet för ditt projekt: <strong>${n}</strong>. På kartan ser du de markerade punkterna med beskrivning och bilder.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333;">Öppna visualiseringen genom att klicka på knappen nedan:</p>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;"><tr><td align="center">
            <a href="${i}" style="display:inline-block;padding:15px 34px;background:${N};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;">Öppna visualisering</a>
          </td></tr></table>

          <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#555;">Om knappen inte fungerar, kopiera och klistra in följande länk i din webbläsare:</p>
          <div style="background:#F5F5F7;border-radius:10px;padding:14px 16px;font-size:13px;color:#333;word-break:break-all;margin:0 0 20px;">${a}</div>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333;">Med vänliga hälsningar,<br>${r}</p>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e6e6ea;border-radius:12px;">
            <tr><td style="padding:18px 20px;">
              <div style="font-size:15px;font-weight:700;color:${M};margin:0 0 10px;">Kontakta oss</div>
              <div style="border-top:1px solid #ececf0;padding-top:10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  ${e.contacts.filter(e=>e.phone).map(e=>`<tr><td style="padding:4px 0;font-size:14px;color:#333;">📞 <strong>${P(e.name)}${e.name?`:`:``}</strong> <span style="color:${M};">${P(e.phone)}</span></td></tr>`).join(``)}
                  <tr><td style="padding:4px 0;font-size:14px;color:#333;">✉️ <strong>E-post:</strong> <span style="color:${M};">${P(e.email)}</span></td></tr>
                  <tr><td style="padding:4px 0;font-size:14px;color:#333;">🌐 <strong>Webbplats:</strong> <span style="color:${M};">${P(e.website)}</span></td></tr>
                </table>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="background:${M};padding:18px 28px;text-align:center;">
          <div style="color:#ffffff;font-size:13px;opacity:.85;">© ${o} ${r}. Alla rättigheter reserverade.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`}var L=n();function R(){let{id:e=``}=f(),t=p(),n=d(),{can:M}=te(),N=b(),P=T(!0),R=r(),z=O(e),B=A(),V=k(),H=D(),[U,W]=(0,j.useState)(!1),[G,K]=(0,j.useState)(!1),[q,J]=(0,j.useState)(``),Y=M(`visualizations_manage`),X=M(`visualizations_work`),Z=z.data?.visualization??null,re=z.data?.points.length??0,Q=(0,j.useRef)(!1);(0,j.useEffect)(()=>{!Y||!Z||Z.public_token||Q.current||(Q.current=!0,ne(e).then(()=>R.invalidateQueries({queryKey:i.visualizations.detail(e)})).catch(()=>{Q.current=!1}))},[Y,Z,e,R]);let ie=()=>{let e=Z?.public_token;e&&navigator.clipboard.writeText(E(e)).then(()=>v.success(n(`viz.linkCopied`))).catch(()=>v.error(n(`viz.errSend`)))},ae=()=>{let e=Z?.public_token;e&&t(`/visualisering/${e}?podglad=1`)},oe=async()=>{let t=q.trim();if(t)try{let n=await B.mutateAsync(e),r=P.data?.name?.trim()||N.data?.companyName?.trim()||`BFTM Fasad & Bygg AB`,i=I({clientName:Z?.client?.name??``,vizTitle:Z?.title??``,url:E(n),companyName:r,logoUrl:N.data?.logoPath?_(N.data.logoPath):null,email:P.data?.email?.trim()||`kontakt@bftm.se`,website:`www.bftm.se`,contacts:P.data?.contacts??[]});await H.mutateAsync({to:t,subject:F(Z?.title??``),html:i}),K(!1),J(``)}catch{}};if(z.isLoading)return(0,L.jsx)(y,{rows:5});if(!Z)return(0,L.jsx)(C,{className:`p-4 text-sm text-text-secondary`,children:n(`viz.empty`)});let $=[];return Z.client?.name&&$.push({label:n(`viz.clientLabel`).replace(/\s*\(.*\)/,``),value:Z.client.name}),Z.address&&$.push({label:n(`viz.addressLabel`),value:Z.address}),$.push({label:n(`viz.pointsTotal`),value:String(re)}),$.push({label:n(`viz.views`),value:(0,L.jsxs)(`span`,{className:`inline-flex items-center gap-1.5`,children:[(0,L.jsx)(h,{className:`size-4 text-text-secondary`}),` `,Z.view_count]})}),$.push({label:n(`viz.createdAtLabel`),value:ee(Z.created_at)}),(0,L.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,L.jsxs)(`button`,{type:`button`,onClick:()=>t(`/wizualizacje`),className:`press flex items-center gap-1 text-sm font-medium text-text-secondary`,children:[(0,L.jsx)(a,{className:`size-4`}),` `,n(`nav.visualizations`)]}),(0,L.jsxs)(C,{className:`flex flex-col gap-3 p-4`,children:[(0,L.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,L.jsx)(`h2`,{className:`text-base font-semibold`,children:Z.title||n(`viz.untitled`)}),(0,L.jsx)(S,{tone:Z.status===`sent`?`success`:`neutral`,children:Z.status===`sent`?n(`viz.statusSent`):n(`viz.statusDraft`)})]}),(0,L.jsx)(`dl`,{className:`flex flex-col gap-1.5 text-sm`,children:$.map(e=>(0,L.jsxs)(`div`,{className:`flex justify-between gap-3`,children:[(0,L.jsx)(`dt`,{className:`text-text-secondary`,children:e.label}),(0,L.jsx)(`dd`,{className:`text-right font-medium`,children:e.value})]},e.label))})]}),(Y||X)&&(0,L.jsx)(m,{fullWidth:!0,size:`lg`,icon:(0,L.jsx)(g,{className:`size-5`}),onClick:()=>t(`/wizualizacje/${e}/punkty`),children:n(`viz.addPoints`)}),Y&&(0,L.jsxs)(`div`,{className:`grid grid-cols-2 gap-2`,children:[(0,L.jsx)(m,{variant:`secondary`,icon:(0,L.jsx)(s,{className:`size-4`}),onClick:()=>t(`/wizualizacje/${e}/edytuj`),children:n(`viz.editTitle`)}),(0,L.jsx)(m,{icon:(0,L.jsx)(c,{className:`size-4`}),onClick:()=>K(!0),children:Z.status===`sent`?n(`viz.resend`):n(`viz.send`)}),(0,L.jsx)(m,{variant:`secondary`,icon:(0,L.jsx)(o,{className:`size-4`}),disabled:!Z.public_token,onClick:ie,children:n(`viz.copyLink`)}),(0,L.jsx)(m,{variant:`secondary`,icon:(0,L.jsx)(h,{className:`size-4`}),disabled:!Z.public_token,onClick:ae,children:n(`viz.openPreview`)}),(0,L.jsx)(m,{variant:`ghost`,className:`col-span-2 text-error`,style:{backgroundColor:`var(--color-error-soft)`},icon:(0,L.jsx)(l,{className:`size-4`}),onClick:()=>W(!0),children:n(`viz.delete`)})]}),(0,L.jsx)(w,{open:G,onClose:()=>K(!1),title:n(`viz.sendTitle`),children:(0,L.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,L.jsx)(`p`,{className:`text-sm text-text-secondary`,children:n(`viz.sendDesc`)}),(0,L.jsx)(x,{label:n(`viz.emailLabel`),type:`email`,placeholder:n(`viz.emailPlaceholder`),value:q,onChange:e=>J(e.target.value)}),(0,L.jsx)(m,{fullWidth:!0,size:`lg`,icon:(0,L.jsx)(c,{className:`size-5`}),loading:B.isPending||H.isPending,disabled:!q.trim(),onClick:oe,children:n(`viz.sendBtn`)})]})}),(0,L.jsx)(u,{open:U,title:n(`viz.delete`),description:n(`viz.deleteConfirm`),destructive:!0,loading:V.isPending,onConfirm:async()=>{await V.mutateAsync(e),t(`/wizualizacje`)},onCancel:()=>W(!1)})]})}export{R as default};