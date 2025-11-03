import { useState, useRef, useCallback } from 'react';
import classNames from 'classnames';
import { debounce } from '../utils/debounce.js';
import { searchUsers, searchRepos } from '../services/github-api.js';
import styles from './AutocompleteInput.module.css';

export const AutocompleteInput = ({
  label,
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  disabled = false,
  owner,
  type,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef(null);

  const fetchOwnerSuggestions = useCallback(async (query) => {
    const results = await searchUsers(query);
    setSuggestions(results);
  }, []);

  const fetchRepoSuggestions = useCallback(async (owner, query) => {
    const results = await searchRepos(owner, query);
    setSuggestions(results);
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (type === 'owner') {
      setShowSuggestions(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchOwnerSuggestions(newValue);
      }, 300);
    } else if (type === 'repo' && owner) {
      setShowSuggestions(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchRepoSuggestions(owner, newValue);
      }, 300);
    }
  };

  const handleSelect = (item) => {
    onSelect(type === 'owner' ? item.login : item.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={styles.autocompleteWrapper}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.autocompleteContainer}>
        <input
          type="text"
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={() => value && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          required
          disabled={disabled}
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className={styles.suggestionsList}>
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className={classNames(
                  styles.suggestionItem,
                  {
                    [styles.suggestionItemHasAvatar]: type === 'owner',
                    [styles.suggestionItemHasDescription]: type === 'repo' && suggestion.description
                  }
                )}
              >
                {type === 'owner' && (
                  <span className={styles.suggestionAvatar}>
                    <img src={suggestion.avatar_url} alt={suggestion.login} />
                  </span>
                )}
                <span className={styles.suggestionText}>
                  {type === 'owner' ? suggestion.login : suggestion.name}
                </span>
                {type === 'repo' && suggestion.description && (
                  <span className={styles.suggestionDescription}>{suggestion.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

