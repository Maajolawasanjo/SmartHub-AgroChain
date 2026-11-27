import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
test("remaining nine public routes use scoped editorial design without removing release gates",()=>{
 for(const route of ["contact","faq","help","insights","insights/[slug]","privacy","terms","cookies","accessibility"]){
  assert.match(read("src/app/"+route+"/page.tsx"),/className="editorial-service editorial-service-/);
 }
 for(const route of ["faq","help"])assert.doesNotMatch(read("src/app/"+route+"/page.tsx"),/font:"900/);
 for(const route of ["privacy","terms","cookies"])assert.match(read("src/app/"+route+"/page.tsx"),/robots:\{index:false,follow:false\}/);
 assert.match(read("src/app/contact/page.tsx"),/PUBLIC_CONTACT_ENABLED==="true"/);
 assert.match(read("src/app/insights/page.tsx"),/publicArticles\(\)/);
 assert.match(read("src/app/insights/\[slug\]/page.tsx"),/publicArticle\(slug\)/);
});
