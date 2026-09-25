"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useStorefront } from "@/components/storefront/storefront-provider";

type Props = { open: boolean; onClose: () => void };

function formatPhone(value: string) {
  const raw = value.replace(/\D/g, "").replace(/^38/, "").slice(0, 10);
  const digits = raw.startsWith("0") ? raw : raw ? `0${raw}` : "";
  const code = digits.slice(1, 3);
  const first = digits.slice(3, 6);
  const second = digits.slice(6, 8);
  const third = digits.slice(8, 10);
  return `+38 (0${code}${code.length === 2 ? ")" : ""}${first ? ` ${first}` : ""}${second ? `-${second}` : ""}${third ? `-${third}` : ""}`;
}

export function CallbackModal({ open, onClose }: Props) {
  const { locale } = useStorefront();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "local" | "error">("idle");
  const [phoneError, setPhoneError] = useState(false);
  const uk = locale === "uk";

  useEffect(() => {
    if (!open) { setPhone(""); setStatus("idle"); setPhoneError(false); }
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phone.replace(/\D/g, "").length < 12) { setPhoneError(true); return; }
    setStatus("sending");
    const endpoint = process.env.NEXT_PUBLIC_CALLBACK_ENDPOINT;
    const payload = { type: "callback", customer: { phone } };
    if (!endpoint) {
      if (process.env.NODE_ENV === "production") { setStatus("error"); return; }
      window.localStorage.setItem(`heymom-callback-${Date.now()}`, JSON.stringify(payload));
      setStatus("local");
      return;
    }
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Callback request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return <div className="callback-layer" role="dialog" aria-modal="true" aria-label={uk ? "Замовити дзвінок" : "Заказать звонок"}>
    <button className="callback-backdrop" aria-label={uk ? "Закрити" : "Закрыть"} onClick={onClose} />
    <div className="callback-modal">
      <button className="callback-close" aria-label={uk ? "Закрити" : "Закрыть"} onClick={onClose}>×</button>
      {status === "success" || status === "local" ? <div className="callback-success" role="status"><span>✓</span><h2>{uk ? "Запит отримано" : "Запрос получен"}</h2><p>{status === "success" ? (uk ? "Ми отримали ваш запит. Очікуйте дзвінка від нашого менеджера." : "Мы получили ваш запрос. Ожидайте звонка от нашего менеджера.") : (uk ? "Заявку збережено лише у демо-режимі цього браузера." : "Заявка сохранена только в демо-режиме этого браузера.")}</p><button className="callback-submit" onClick={onClose}>{uk ? "Зрозуміло" : "Понятно"}</button></div> : <form onSubmit={submit}>
        <span className="eyebrow">Heymom</span>
        <h2>{uk ? "Замовити дзвінок" : "Заказать звонок"}</h2>
        <p>{uk ? "Залиш номер — менеджер зателефонує та допоможе з вибором." : "Оставьте номер — менеджер перезвонит и поможет с выбором."}</p>
        <label>{uk ? "Номер телефону" : "Номер телефона"}<input type="tel" inputMode="numeric" autoFocus value={phone} onChange={(event) => { setPhone(formatPhone(event.target.value)); setPhoneError(false); }} placeholder="+38 (0__) ___-__-__" aria-invalid={phoneError} aria-describedby={phoneError ? "callback-phone-error" : undefined} required /></label>
        {phoneError && <p id="callback-phone-error" className="callback-field-error" role="alert">{uk ? "Введіть повний український номер телефону." : "Введите полный украинский номер телефона."}</p>}
        {status === "error" && <p className="callback-field-error" role="alert">{uk ? "Не вдалося надіслати запит. Спробуйте ще раз або зателефонуйте нам." : "Не удалось отправить запрос. Попробуйте ещё раз или позвоните нам."}</p>}
        <button className="callback-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? (uk ? "Надсилаємо…" : "Отправляем…") : (uk ? "Надіслати" : "Отправить")}</button>
      </form>}
    </div>
  </div>;
}
