import{c as o,r as n,j as e}from"./index-BKtMGj6E.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=o("EyeOff",[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24",key:"1jxqfv"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",key:"9wicm4"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",key:"1jreej"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=o("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=o("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]),f=n.forwardRef(({label:i,error:t,type:c="text",icon:s,className:l="",...x},d)=>{const[r,p]=n.useState(!1),a=c==="password",m=a?r?"text":"password":c;return e.jsxs("div",{className:`w-full ${l}`,children:[i&&e.jsx("label",{className:"block text-sm font-medium text-secondary mb-1.5",children:i}),e.jsxs("div",{className:"relative",children:[s&&e.jsx("div",{className:"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted",children:e.jsx(s,{size:18})}),e.jsx("input",{ref:d,type:m,className:`
            block w-full rounded-lg bg-bg-tertiary border-transparent
            focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20
            transition-all duration-200 text-text-primary placeholder:text-text-muted
            ${s?"pl-10":"pl-4"} 
            ${a?"pr-10":"pr-4"} 
            py-2.5 sm:text-sm
            ${t?"border-error bg-error/5 focus:border-error focus:ring-error":""}
          `,...x}),a&&e.jsx("button",{type:"button",className:"absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-secondary",onClick:()=>p(!r),children:r?e.jsx(y,{size:18}):e.jsx(u,{size:18})})]}),t&&e.jsx("p",{className:"mt-1.5 text-sm text-error",children:t})]})});f.displayName="Input";export{f as I,j as M};
