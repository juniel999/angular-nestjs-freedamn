import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faHome, 
  faSearch, 
  faBell, 
  faPlus, 
  faUser, 
  faCog, 
  faSignOutAlt, 
  faBars,
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { 
  faCommentDots,
  faBell as faBellRegular
} from '@fortawesome/free-regular-svg-icons';
import {
  faTwitter,
  faGithub
} from '@fortawesome/free-brands-svg-icons';

export function initializeIcons(library: FaIconLibrary) {
  // Add icons to the library for convenient access in components
  library.addIcons(
    faHome,
    faSearch,
    faBell,
    faBellRegular,
    faPlus,
    faUser,
    faCog,
    faSignOutAlt,
    faBars,
    faCommentDots,
    faTwitter,
    faGithub,
    faEye,
    faEyeSlash
  );
} 