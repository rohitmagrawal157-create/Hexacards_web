"use client";

import { PhoneInput, type CountryIso2 } from "react-international-phone";
import "react-international-phone/style.css";

type PhoneNumberFieldProps = {
  label: string;
  value: string;
  defaultCountry?: string;
  onChange: (value: string) => void;
  onCountryChange?: (country: string) => void;
  placeholder?: string;
};

export default function PhoneNumberField({
  label,
  value,
  defaultCountry = "IN",
  onChange,
  onCountryChange,
  placeholder = "Phone number",
}: PhoneNumberFieldProps) {
  const country = (defaultCountry || "IN").toLowerCase() as CountryIso2;

  return (
    <div className="block">
      <p className="text-[11px] font-semibold tracking-wide text-[#8a8174] uppercase">
        {label}
      </p>
      <div className="hexa-phone-field mt-1.5">
        <PhoneInput
          defaultCountry={country}
          value={value || ""}
          onChange={(phone, meta) => {
            onChange(phone);
            if (meta.country?.iso2 && onCountryChange) {
              onCountryChange(meta.country.iso2.toUpperCase());
            }
          }}
          forceDialCode
          placeholder={placeholder}
          preferredCountries={[
            "in",
            "us",
            "ae",
            "gb",
            "sg",
            "au",
            "sa",
            "qa",
            "ca",
            "de",
          ]}
          countrySelectorStyleProps={{
            buttonClassName: "hexa-phone-country-btn",
            dropdownStyleProps: {
              className: "hexa-phone-dropdown",
              listItemClassName: "hexa-phone-dropdown-item",
              listItemCountryNameClassName: "hexa-phone-dropdown-name",
              listItemDialCodeClassName: "hexa-phone-dropdown-dial",
            },
          }}
          inputClassName="hexa-phone-input-el"
          inputProps={{
            name: label.toLowerCase().replace(/\s+/g, "-"),
            autoComplete: "tel",
          }}
        />
      </div>
    </div>
  );
}
