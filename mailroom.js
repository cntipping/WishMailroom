const cabinet = document.querySelector("#mailboxes");
const dialog = document.querySelector("#letter");
const recipient = document.querySelector("#recipient");
const letterContent = document.querySelector("#letter-content");
const polaroid = document.querySelector("#polaroid");
const photo = document.querySelector("#letter-photo");
const message = document.querySelector("#message");
const keyForm = document.querySelector("#key-form");
const key = document.querySelector("#key");
const keyError = document.querySelector("#key-error");
let openDoor;
let selectedLetter;

const doorFace = '<span class="face" aria-hidden="true"><span class="knob"></span><span class="plate"></span></span>';

for (const letter of letters) {
  const door = document.createElement("button");
  door.type = "button";
  door.className = "mailbox";
  door.setAttribute("aria-haspopup", "dialog");
  door.innerHTML = doorFace;
  door.querySelector(".plate").textContent = letter.name;
  door.setAttribute("aria-label", 'Open mailbox for ' + letter.name);
  door.addEventListener("click", () => {
    openDoor = door;
    selectedLetter = letter;
    recipient.textContent = letter.name;
    dialog.showModal();
    key.focus();
    dialog.scrollTop = 0;
  });
  cabinet.append(door);
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function unlock(letter, value) {
  if (!letter.ciphertext) return value === letter.code ? letter : null;
  if (!/^[a-f0-9]{32}$/i.test(value)) return null;
  const bytes = Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
  const secret = await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(letter.iv) }, secret, fromBase64(letter.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

keyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const letter = selectedLetter;
  const door = openDoor;
  let contents;
  try {
    contents = await unlock(letter, key.value.trim());
  } catch {
    contents = null;
  }
  if (!dialog.open || door !== openDoor || keyForm.hidden) return;
  if (!contents) {
    keyError.textContent = "That key doesn’t match this mailbox.";
    key.setAttribute("aria-invalid", "true");
    key.select();
    return;
  }

  openDoor.classList.add("open");
  recipient.textContent = "Dear " + selectedLetter.name + ",";
  message.replaceChildren(...contents.paragraphs.map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }));
  if (contents.photoData || contents.photo) {
    photo.alt = contents.photoAlt ?? "";
    photo.src = contents.photoData || "./photos/" + encodeURIComponent(contents.photo);
    polaroid.hidden = false;
  }
  letterContent.hidden = false;
  keyForm.hidden = true;
  dialog.querySelector(".close").focus();
});

photo.addEventListener("error", () => {
  polaroid.hidden = true;
});

key.addEventListener("input", () => {
  keyError.textContent = "";
  key.removeAttribute("aria-invalid");
});

dialog.addEventListener("close", () => {
  openDoor?.classList.remove("open");
  openDoor?.focus({ preventScroll: true });
  openDoor = undefined;
  selectedLetter = undefined;
  keyForm.reset();
  keyForm.hidden = false;
  keyError.textContent = "";
  key.removeAttribute("aria-invalid");
  message.replaceChildren();
  letterContent.hidden = true;
  polaroid.hidden = true;
  photo.removeAttribute("src");
  photo.alt = "";
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
