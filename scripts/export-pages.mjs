import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "pages-dist");
const basePath = "/portafolio-jorge-castro";
const serverUrl = "http://127.0.0.1:3000/";
const vinextCli = path.join(root,"node_modules","vinext","dist","cli.js");

const server = spawn(process.execPath, [vinextCli,"start"], {
  cwd: root,
  env: { ...process.env, HOST: "127.0.0.1", PORT: "3000" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", chunk => { serverOutput += chunk.toString(); });
server.stderr.on("data", chunk => { serverOutput += chunk.toString(); });

async function waitForServer(){
  for(let attempt = 0; attempt < 60; attempt += 1){
    try{
      const response = await fetch(serverUrl);
      if(response.ok) return response;
    }catch{}
    await new Promise(resolve => setTimeout(resolve,1000));
  }
  throw new Error(`The local portfolio server did not start.\n${serverOutput}`);
}

function addBasePath(source){
  const rootAssets = [
    "/assets/",
    "/logos/",
    "/CV-Jorge-Castro.pdf",
    "/dashboard-ecommerce.png",
    "/dashboard-retail.png",
    "/jorge-castro-clean.png",
    "/jorge-castro-profile.png",
    "/jorge-castro.jpg",
    "/og.png",
    "/favicon.svg",
    "/file.svg",
    "/globe.svg",
    "/window.svg",
  ];

  let result = source;
  for(const asset of rootAssets){
    result = result.replaceAll(asset,`${basePath}${asset}`);
  }

  // Vite's preload helper builds root-relative chunk URLs at runtime.
  result = result.replaceAll("return`/`+e",`return\`${basePath}/\`+e`);
  return result;
}

async function patchJavaScript(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const entryPath = path.join(directory,entry.name);
    if(entry.isDirectory()) await patchJavaScript(entryPath);
    if(entry.isFile() && entry.name.endsWith(".js")){
      const source = await readFile(entryPath,"utf8");
      await writeFile(entryPath,addBasePath(source),"utf8");
    }
  }
}

try{
  const response = await waitForServer();
  const html = await response.text();

  await rm(output,{recursive:true,force:true});
  await mkdir(output,{recursive:true});
  await cp(path.join(root,"dist","client"),output,{recursive:true});
  await patchJavaScript(path.join(output,"assets"));

  const pageHtml = addBasePath(html)
    .replaceAll(`${basePath}${basePath}/`,`${basePath}/`)
    .replace(
      `<meta property="og:image" content="${basePath}/og.png"/>`,
      `<meta property="og:image" content="https://goku230491-cmd.github.io${basePath}/og.png"/>`,
    )
    .replace(
      `<meta name="twitter:image" content="${basePath}/og.png"/>`,
      `<meta name="twitter:image" content="https://goku230491-cmd.github.io${basePath}/og.png"/>`,
    );

  await writeFile(path.join(output,"index.html"),pageHtml,"utf8");
  await writeFile(path.join(output,".nojekyll"),"","utf8");
  console.log(`GitHub Pages export created at ${output}`);
}finally{
  server.kill();
}
