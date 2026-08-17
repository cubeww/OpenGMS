export type GmlFunction = {
  name: string
  signature: string
  description: string
  category: string
}

export const gmlFunctions: GmlFunction[] = [
  {
    "name": "alarm_get",
    "signature": "alarm_get(index)",
    "description": "Get the value of a given alarm.",
    "category": "Miscellaneous"
  },
  {
    "name": "alarm_set",
    "signature": "alarm_set(index, value)",
    "description": "Set an alarm to the given value.",
    "category": "Miscellaneous"
  },
  {
    "name": "angle_difference",
    "signature": "angle_difference(ang1, ang2)",
    "description": "Returns the difference between two angles.",
    "category": "Maths"
  },
  {
    "name": "ansi_char",
    "signature": "ansi_char(val)",
    "description": "Returns a string containing the character with raw BYTE value set.",
    "category": "Strings"
  },
  {
    "name": "application_get_position",
    "signature": "application_get_position()",
    "description": "Get the position for default drawing of the application surface.",
    "category": "Surfaces"
  },
  {
    "name": "application_surface_draw_enable",
    "signature": "application_surface_draw_enable(flag)",
    "description": "Enable or disable the automatic drawing of the application surface.",
    "category": "Surfaces"
  },
  {
    "name": "application_surface_enable",
    "signature": "application_surface_enable(enable)",
    "description": "Enable or disable the use of the application surface.",
    "category": "Surfaces"
  },
  {
    "name": "application_surface_is_enabled",
    "signature": "application_surface_is_enabled()",
    "description": "Returns whether the application surface is enabled or not.",
    "category": "Surfaces"
  },
  {
    "name": "asset_get_index",
    "signature": "asset_get_index(name)",
    "description": "Returns the unique index of the game asset with the given name.",
    "category": "Game Assets"
  },
  {
    "name": "asset_get_type",
    "signature": "asset_get_type(name)",
    "description": "Returns the type of game asset referenced from its name.",
    "category": "Game Assets"
  },
  {
    "name": "audio_channel_num",
    "signature": "audio_channel_num(num)",
    "description": "Set the number of available audio channels.",
    "category": "Game Assets"
  },
  {
    "name": "audio_create_buffer_sound",
    "signature": "audio_create_buffer_sound(bufferId, bufferFormat, bufferRate, bufferOffset, bufferLength, bufferChannels)",
    "description": "Create a new sound from the contents of a buffer.",
    "category": "Game Assets"
  },
  {
    "name": "audio_create_play_queue",
    "signature": "audio_create_play_queue(queueFormat, queueRate, queueChannels)",
    "description": "Create a queue of audio from a buffer for streaming.",
    "category": "Game Assets"
  },
  {
    "name": "audio_create_stream",
    "signature": "audio_create_stream(filename)",
    "description": "Create a new sound index from an external audio source for streaming.",
    "category": "Game Assets"
  },
  {
    "name": "audio_create_sync_group",
    "signature": "audio_create_sync_group(loop)",
    "description": "Create a new synchronisation group for audio.",
    "category": "Game Assets"
  },
  {
    "name": "audio_debug",
    "signature": "audio_debug(enable)",
    "description": "Enable or disable the audio debug overlay.",
    "category": "Game Assets"
  },
  {
    "name": "audio_destroy_stream",
    "signature": "audio_destroy_stream(filename)",
    "description": "Remove the given audio stream from memory.",
    "category": "Game Assets"
  },
  {
    "name": "audio_destroy_sync_group",
    "signature": "audio_destroy_sync_group(group_index)",
    "description": "Get the current play position for the given sync group.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_create",
    "signature": "audio_emitter_create()",
    "description": "Create a new audio emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_exists",
    "signature": "audio_emitter_exists(index)",
    "description": "Checks whether the given emitter exists.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_falloff",
    "signature": "audio_emitter_falloff(emitter, falloff_ref, falloff_max, falloff_factor)",
    "description": "Changes the audio fall-off distance for an emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_free",
    "signature": "audio_emitter_free(emitter)",
    "description": "Removes the given emitter from memory.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_gain",
    "signature": "audio_emitter_gain(emitter, gain)",
    "description": "Changes the maximum gain (volume) for an emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_gain",
    "signature": "audio_emitter_get_gain(emitter)",
    "description": "Returns the current gain of a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_listener_mask",
    "signature": "audio_emitter_get_listener_mask(emitterID)",
    "description": "Gets the listener bit-mask data for an emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_pitch",
    "signature": "audio_emitter_get_pitch(emitter)",
    "description": "Returns the current pitch of a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_vx",
    "signature": "audio_emitter_get_vx(emitter)",
    "description": "Returns the current velocity along the x axis for a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_vy",
    "signature": "audio_emitter_get_vy(emitter)",
    "description": "Returns the current velocity along the y axis for a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_vz",
    "signature": "audio_emitter_get_vz(emitter)",
    "description": "Returns the current velocity along the z axis for a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_x",
    "signature": "audio_emitter_get_x(emitter)",
    "description": "Returns the current x position of a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_y",
    "signature": "audio_emitter_get_y(emitter)",
    "description": "Returns the current y position of a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_get_z",
    "signature": "audio_emitter_get_z(emitter)",
    "description": "Returns the current z position of a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_pitch",
    "signature": "audio_emitter_pitch(emitter, pitch)",
    "description": "Changes the output pitch for sounds played by the emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_position",
    "signature": "audio_emitter_position(emitter, x, y, z)",
    "description": "Changes the position of the given emitter within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_set_listener_mask",
    "signature": "audio_emitter_set_listener_mask(emitterID, mask)",
    "description": "Sets the bit mask for a given emitter, defining the listeners to play it to.",
    "category": "Game Assets"
  },
  {
    "name": "audio_emitter_velocity",
    "signature": "audio_emitter_velocity(emitter, vx, vy, vz)",
    "description": "Changes the doppler calculations of the emitter within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_exists",
    "signature": "audio_exists(index)",
    "description": "Checks whether the given sound exists.",
    "category": "Game Assets"
  },
  {
    "name": "audio_falloff_set_model",
    "signature": "audio_falloff_set_model(model)",
    "description": "Sets the model on which all falloff values will be calculated.",
    "category": "Game Assets"
  },
  {
    "name": "audio_free_buffer_sound",
    "signature": "audio_free_buffer_sound(index)",
    "description": "Frees the buffered sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_free_play_queue",
    "signature": "audio_free_play_queue(queueIndex)",
    "description": "Free the memory associated with an audio queue.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_listener_count",
    "signature": "audio_get_listener_count()",
    "description": "Returns the number of available listeners for the target platform.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_listener_info",
    "signature": "audio_get_listener_info(num)",
    "description": "Returns a ds_map with information about the listener.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_listener_mask",
    "signature": "audio_get_listener_mask()",
    "description": "Gets the default (global) listener bit mask.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_master_gain",
    "signature": "audio_get_master_gain(listenerIndex)",
    "description": "Get the global sound and music volume for a specific listener.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_name",
    "signature": "audio_get_name(index)",
    "description": "Returns the name (as a string) of the given audio resource.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_recorder_count",
    "signature": "audio_get_recorder_count()",
    "description": "Returns the number of recording devices found attached to the system.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_recorder_info",
    "signature": "audio_get_recorder_info(recorder_index)",
    "description": "Returns a ds_map containing information about the indexed recording device.",
    "category": "Game Assets"
  },
  {
    "name": "audio_get_type",
    "signature": "audio_get_type(index)",
    "description": "Returns the type of audio for the given sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_is_loaded",
    "signature": "audio_group_is_loaded(groupID)",
    "description": "Check an audio group to see if it is loaded into memory.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_load",
    "signature": "audio_group_load(groupID)",
    "description": "Load an audio group into memory asynchronously.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_load_progress",
    "signature": "audio_group_load_progress(groupID)",
    "description": "Get the loading progress for an audio group.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_name",
    "signature": "audio_group_name(groupID)",
    "description": "Returns the name of the audio group as a string.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_set_gain",
    "signature": "audio_group_set_gain(groupID, volume, time)",
    "description": "Set the gain for all audio assigned to the given group.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_stop",
    "signature": "audio_group_stop(groupID)",
    "description": "Stops all sounds assigned to a given audio group playing.",
    "category": "Game Assets"
  },
  {
    "name": "audio_group_unload",
    "signature": "audio_group_unload(groupID)",
    "description": "Unload an audio group from memory.",
    "category": "Game Assets"
  },
  {
    "name": "audio_is_paused",
    "signature": "audio_is_paused(index)",
    "description": "Checks to see if the indicated sound is paused.",
    "category": "Game Assets"
  },
  {
    "name": "audio_is_playing",
    "signature": "audio_is_playing(index)",
    "description": "Checks to see if the indicated sound is playing.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_get_data",
    "signature": "audio_listener_get_data(index)",
    "description": "Returns a ds_map with position, velocity and orientation data for the given listener.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_orientation",
    "signature": "audio_listener_orientation(lookat_x, lookat_y, lookat_z, up_x, up_y, up_z)",
    "description": "Changes the orientation of the listener within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_position",
    "signature": "audio_listener_position(x, y, z)",
    "description": "Changes the position of the listener within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_set_orientation",
    "signature": "audio_listener_set_orientation(index, x, y, z)",
    "description": "Changes the orientation of the given listener within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_set_position",
    "signature": "audio_listener_set_position(index, x, y, z)",
    "description": "Changes the position of the given listener within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_set_velocity",
    "signature": "audio_listener_set_velocity(index, x, y, z)",
    "description": "Changes the velocity of the given listener within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_listener_velocity",
    "signature": "audio_listener_velocity(vx, vy, vz)",
    "description": "Changes the doppler calculations of the listener within the audio space.",
    "category": "Game Assets"
  },
  {
    "name": "audio_master_gain",
    "signature": "audio_master_gain(gain)",
    "description": "Set the global sound and music volume.",
    "category": "Game Assets"
  },
  {
    "name": "audio_music_gain",
    "signature": "audio_music_gain(volume, time)",
    "description": "Set the volume for music files to play at (OBSOLETED).",
    "category": "Game Assets"
  },
  {
    "name": "audio_music_is_playing",
    "signature": "audio_music_is_playing()",
    "description": "Checks to see if music is currently playing (OBSOLETED).",
    "category": "Game Assets"
  },
  {
    "name": "audio_pause_all",
    "signature": "audio_pause_all()",
    "description": "Pauses all sounds.",
    "category": "Game Assets"
  },
  {
    "name": "audio_pause_music",
    "signature": "audio_pause_music()",
    "description": "Pauses the indicated music track (OBSOLETED).",
    "category": "Game Assets"
  },
  {
    "name": "audio_pause_sound",
    "signature": "audio_pause_sound(index)",
    "description": "Pauses the indicated sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_pause_sync_group",
    "signature": "audio_pause_sync_group(group_index)",
    "description": "Pause a synchronised group of tracks that are currently playing.",
    "category": "Game Assets"
  },
  {
    "name": "audio_play_in_sync_group",
    "signature": "audio_play_in_sync_group(group_index, sound_index)",
    "description": "Assign a sound resource to a sync group.",
    "category": "Game Assets"
  },
  {
    "name": "audio_play_music",
    "signature": "audio_play_music(index, loop)",
    "description": "Plays the indicated background music either once or in a continuous loop (OBSOLETE).",
    "category": "Game Assets"
  },
  {
    "name": "audio_play_sound",
    "signature": "audio_play_sound(index, priority, loop)",
    "description": "Plays the indicated sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_play_sound_at",
    "signature": "audio_play_sound_at(index, x, y, z, falloff_ref, falloff_max, falloff_factor, loop, priority)",
    "description": "Plays the indicated sound at a given position.",
    "category": "Game Assets"
  },
  {
    "name": "audio_play_sound_on",
    "signature": "audio_play_sound_on(emitter, sound, loop, priority)",
    "description": "Plays the indicated sound on a given emitter.",
    "category": "Game Assets"
  },
  {
    "name": "audio_queue_sound",
    "signature": "audio_queue_sound(queueIndex, bufferId, bufferOffset, bufferLength)",
    "description": "Add audio to the audio queue from a buffer.",
    "category": "Game Assets"
  },
  {
    "name": "audio_resume_all",
    "signature": "audio_resume_all()",
    "description": "Resumes all sounds after they have been paused.",
    "category": "Game Assets"
  },
  {
    "name": "audio_resume_music",
    "signature": "audio_resume_music()",
    "description": "Resumes the current music track after it has been paused (OBSOLETE).",
    "category": "Game Assets"
  },
  {
    "name": "audio_resume_sound",
    "signature": "audio_resume_sound(index)",
    "description": "Resumes the indicated sound after it has been paused.",
    "category": "Game Assets"
  },
  {
    "name": "audio_resume_sync_group",
    "signature": "audio_resume_sync_group(group_index)",
    "description": "Resume playing a paused synchronised group of tracks.",
    "category": "Game Assets"
  },
  {
    "name": "audio_set_listener_mask",
    "signature": "audio_set_listener_mask(mask)",
    "description": "Sets the default (global) listener bit mask.",
    "category": "Game Assets"
  },
  {
    "name": "audio_set_master_gain",
    "signature": "audio_set_master_gain(listenerIndex, gain)",
    "description": "Set the global sound and music volume for a specific listener.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_gain",
    "signature": "audio_sound_gain(index, volume, time)",
    "description": "Set the volume for a specific sound to play at, either instantly or over a given time.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_get_gain",
    "signature": "audio_sound_get_gain(index)",
    "description": "Get the volume a specific sound is set to play at.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_get_listener_mask",
    "signature": "audio_sound_get_listener_mask(soundID)",
    "description": "Gets the listener bit-mask data for a sound being played.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_get_pitch",
    "signature": "audio_sound_get_pitch(index)",
    "description": "Get the pitch of the given sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_get_track_position",
    "signature": "audio_sound_get_track_position(index)",
    "description": "Set a time position for a sound to play from.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_length",
    "signature": "audio_sound_length(index)",
    "description": "Returns the length of the indexed sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_pitch",
    "signature": "audio_sound_pitch(index, pitch)",
    "description": "Set the pitch of the given sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_set_listener_mask",
    "signature": "audio_sound_set_listener_mask(soundID, mask)",
    "description": "Sets the bit mask for a given sound, defining the listeners to play it to.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sound_set_track_position",
    "signature": "audio_sound_set_track_position(index, time)",
    "description": "Set a time position for a sound to play from.",
    "category": "Game Assets"
  },
  {
    "name": "audio_start_recording",
    "signature": "audio_start_recording(recorder_index)",
    "description": "Start recording audio to the recorder buffer from a given source.",
    "category": "Game Assets"
  },
  {
    "name": "audio_start_sync_group",
    "signature": "audio_start_sync_group(group_index)",
    "description": "Start a group of synchronised audio tracks playing.",
    "category": "Game Assets"
  },
  {
    "name": "audio_stop_all",
    "signature": "audio_stop_all()",
    "description": "Stops all the currently playing sounds.",
    "category": "Game Assets"
  },
  {
    "name": "audio_stop_music",
    "signature": "audio_stop_music()",
    "description": "Stops the indicated background music (OBSOLETE).",
    "category": "Game Assets"
  },
  {
    "name": "audio_stop_recording",
    "signature": "audio_stop_recording(channel_index)",
    "description": "Add audio to the audio queue from a buffer.",
    "category": "Game Assets"
  },
  {
    "name": "audio_stop_sound",
    "signature": "audio_stop_sound(index)",
    "description": "Stops the indicated sound.",
    "category": "Game Assets"
  },
  {
    "name": "audio_stop_sync_group",
    "signature": "audio_stop_sync_group(group_index)",
    "description": "Stop a synchronised group of tracks that are currently playing.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sync_group_debug",
    "signature": "audio_sync_group_debug(group_index)",
    "description": "Toggle on or off the audio sync group debug overlay.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sync_group_get_track_pos",
    "signature": "audio_sync_group_get_track_pos(group_index)",
    "description": "Get the current play position for the given sync group.",
    "category": "Game Assets"
  },
  {
    "name": "audio_sync_group_is_playing",
    "signature": "audio_sync_group_is_playing(group_index)",
    "description": "Check to see if the given sync group is currently playing any audio.",
    "category": "Game Assets"
  },
  {
    "name": "audio_system",
    "signature": "audio_system()",
    "description": "Checks whether the legacy sound or normal audio is in use.",
    "category": "Game Assets"
  },
  {
    "name": "background_add",
    "signature": "background_add(fname, removeback, smooth)",
    "description": "Adds an image from a file to the set of sprite resources.",
    "category": "Game Assets"
  },
  {
    "name": "background_assign",
    "signature": "background_assign(index, background)",
    "description": "Assigns one background to another background index.",
    "category": "Game Assets"
  },
  {
    "name": "background_create_colour",
    "signature": "background_create_colour(w, h, col)",
    "description": "Creates a new background of a given size and colour.",
    "category": "Game Assets"
  },
  {
    "name": "background_create_from_surface",
    "signature": "background_create_from_surface(index, x, y, w, h, removeback, smooth)",
    "description": "Creates a background by copying an area from a surface.",
    "category": "Game Assets"
  },
  {
    "name": "background_create_gradient",
    "signature": "background_create_gradient(w, h, colour1, colour2, kind)",
    "description": "Creates a new background with a coloured gradient.",
    "category": "Game Assets"
  },
  {
    "name": "background_delete",
    "signature": "background_delete(index)",
    "description": "Deletes the background from memory, freeing the memory used.",
    "category": "Game Assets"
  },
  {
    "name": "background_duplicate",
    "signature": "background_duplicate(index)",
    "description": "Creates a duplicate of the background with the given index.",
    "category": "Game Assets"
  },
  {
    "name": "background_exists",
    "signature": "background_exists(index)",
    "description": "Determines whether a background exists or not.",
    "category": "Game Assets"
  },
  {
    "name": "background_flush",
    "signature": "background_flush(ind)",
    "description": "Flush a background asset (and the texture page it's on) from memory.",
    "category": "Game Assets"
  },
  {
    "name": "background_get_height",
    "signature": "background_get_height(index)",
    "description": "Finds the height of a background.",
    "category": "Game Assets"
  },
  {
    "name": "background_get_name",
    "signature": "background_get_name(index)",
    "description": "Gets the name of a background.",
    "category": "Game Assets"
  },
  {
    "name": "background_get_texture",
    "signature": "background_get_texture(back)",
    "description": "Returns the texture id for the given background.",
    "category": "Game Assets"
  },
  {
    "name": "background_get_uvs",
    "signature": "background_get_uvs(back)",
    "description": "Returns the texture coordinates of the background within the texture page as an array.",
    "category": "Game Assets"
  },
  {
    "name": "background_get_width",
    "signature": "background_get_width(index)",
    "description": "Finds the width of a background.",
    "category": "Game Assets"
  },
  {
    "name": "background_prefetch",
    "signature": "background_prefetch(ind)",
    "description": "Fetch the texture page for a given background asset.",
    "category": "Game Assets"
  },
  {
    "name": "background_prefetch_multi",
    "signature": "background_prefetch_multi(array)",
    "description": "Fetch multiple texture pages for a number of background assets.",
    "category": "Game Assets"
  },
  {
    "name": "background_replace",
    "signature": "background_replace(ind, fname)",
    "description": "Replace a background resource with another one.",
    "category": "Game Assets"
  },
  {
    "name": "background_save",
    "signature": "background_save(back, fname)",
    "description": "Save a background to disc.",
    "category": "Game Assets"
  },
  {
    "name": "background_set_alpha_from_background",
    "signature": "background_set_alpha_from_background(ind, back)",
    "description": "Changes the alpha (transparency) of one given background based on the intensity/value map of another.",
    "category": "Game Assets"
  },
  {
    "name": "base64_decode",
    "signature": "base64_decode(string)",
    "description": "Decode a base64 format string.",
    "category": "File Handling"
  },
  {
    "name": "base64_encode",
    "signature": "base64_encode(string)",
    "description": "Encode a string using base64 format.",
    "category": "File Handling"
  },
  {
    "name": "buffer_async_group_begin",
    "signature": "buffer_async_group_begin(groupname)",
    "description": "Begin the definition of a buffer group for asynchronous saving.",
    "category": "Buffers"
  },
  {
    "name": "buffer_async_group_end",
    "signature": "buffer_async_group_end()",
    "description": "Ends the definition of a buffer save group and initiates the saving.",
    "category": "Buffers"
  },
  {
    "name": "buffer_async_group_option",
    "signature": "buffer_async_group_option(option, value)",
    "description": "Set various options for saving a buffer group asynchronously.",
    "category": "Buffers"
  },
  {
    "name": "buffer_base64_decode",
    "signature": "buffer_base64_decode(string)",
    "description": "Decode a base64 encoded string into a buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_base64_decode_ext",
    "signature": "buffer_base64_decode_ext(buffer, string, offset)",
    "description": "Decode a base64 encoded string into a buffer at the given offset.",
    "category": "Buffers"
  },
  {
    "name": "buffer_base64_encode",
    "signature": "buffer_base64_encode(buffer, offset, size)",
    "description": "Encode a section of a buffer using base64",
    "category": "Buffers"
  },
  {
    "name": "buffer_copy",
    "signature": "buffer_copy(src_buffer, src_offset, size, dest_buffer, dest_offset)",
    "description": "Copy all or part of one buffer to another.",
    "category": "Buffers"
  },
  {
    "name": "buffer_copy_from_vertex_buffer",
    "signature": "buffer_copy_from_vertex_buffer(vertex_buffer, start_vertex, num_vertices, dest_buffer, dest_offset)",
    "description": "Copy all or part of a vertex buffer into a regular buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_create",
    "signature": "buffer_create(size, type, alignment)",
    "description": "Create a new buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_create_from_vertex_buffer",
    "signature": "buffer_create_from_vertex_buffer(vertex_buffer, type, alignment)",
    "description": "Create a new buffer using data from a vertex buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_create_from_vertex_buffer_ext",
    "signature": "buffer_create_from_vertex_buffer_ext(vertex_buffer, type, alignment, start_vertex, num_vertices)",
    "description": "Create a new buffer using data from a vertex buffer, specifying the number of vertices in the buffer to use.",
    "category": "Buffers"
  },
  {
    "name": "buffer_delete",
    "signature": "buffer_delete(buffer)",
    "description": "Delete a previously created buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_exists",
    "signature": "buffer_exists(buffer)",
    "description": "Checks to see if the input variable is a buffer ID or not.",
    "category": "Buffers"
  },
  {
    "name": "buffer_fill",
    "signature": "buffer_fill(buffer, offset, type, value, size)",
    "description": "Writes data to a buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_get_address",
    "signature": "buffer_get_address(buffer)",
    "description": "Get the raw, aligned, buffer address.",
    "category": "Buffers"
  },
  {
    "name": "buffer_get_alignment",
    "signature": "buffer_get_alignment(buffer)",
    "description": "Get the byte alignment of the given buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_get_size",
    "signature": "buffer_get_size(index)",
    "description": "Get the size (in bytes) of the given buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_get_surface",
    "signature": "buffer_get_surface(buffer, surface, mode, offset, modulo)",
    "description": "Copy surface data to a buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_get_type",
    "signature": "buffer_get_type(buffer)",
    "description": "Get the type of buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_load",
    "signature": "buffer_load(filename)",
    "description": "Load a previously saved buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_load_async",
    "signature": "buffer_load_async(buffer, filename, offset, size)",
    "description": "Load the contents of a file into a buffer asynchronously.",
    "category": "Buffers"
  },
  {
    "name": "buffer_load_ext",
    "signature": "buffer_load_ext(buffer, filename, offset)",
    "description": "Load the contents of a previously saved buffer into a buffer at the given position.",
    "category": "Buffers"
  },
  {
    "name": "buffer_md5",
    "signature": "buffer_md5(buffer, offset, size)",
    "description": "Create an md5 hash for the given buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_peek",
    "signature": "buffer_peek(buffer, offset, type)",
    "description": "Read data from a buffer at the given position.",
    "category": "Buffers"
  },
  {
    "name": "buffer_poke",
    "signature": "buffer_poke(buffer, offset, type, value)",
    "description": "Add data to a buffer at a specific position.",
    "category": "Buffers"
  },
  {
    "name": "buffer_read",
    "signature": "buffer_read(buffer, type)",
    "description": "Read from a buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_resize",
    "signature": "buffer_resize(buffer, newsize)",
    "description": "Resize a given buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_save",
    "signature": "buffer_save(buffer, filename)",
    "description": "Save the contents of a buffer to a file.",
    "category": "Buffers"
  },
  {
    "name": "buffer_save_async",
    "signature": "buffer_save_async(buffer, filename, offset, size)",
    "description": "Save part of the contents of a buffer to a file asynchronously.",
    "category": "Buffers"
  },
  {
    "name": "buffer_save_ext",
    "signature": "buffer_save_ext(buffer, filename, offset, size)",
    "description": "Save part of the contents of a buffer to a file.",
    "category": "Buffers"
  },
  {
    "name": "buffer_seek",
    "signature": "buffer_seek(buffer, base, offset)",
    "description": "Move to a point within the buffer for reading/writing.",
    "category": "Buffers"
  },
  {
    "name": "buffer_set_surface",
    "signature": "buffer_set_surface(buffer, surface, mode, offset, modulo)",
    "description": "Copy buffer data to a surface.",
    "category": "Buffers"
  },
  {
    "name": "buffer_sha1",
    "signature": "buffer_sha1(buffer, offset, size)",
    "description": "Create a sha1 hash for the given buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_sizeof",
    "signature": "buffer_sizeof(type)",
    "description": "Returns the size (in bytes) of a given buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_tell",
    "signature": "buffer_tell(buffer)",
    "description": "Get the current \"seek\" position within the buffer.",
    "category": "Buffers"
  },
  {
    "name": "buffer_write",
    "signature": "buffer_write(buffer, type, value)",
    "description": "Writes data to a buffer.",
    "category": "Buffers"
  },
  {
    "name": "chr",
    "signature": "chr(val)",
    "description": "Returns a string containing the character with the given Unicode code.",
    "category": "Strings"
  },
  {
    "name": "clamp",
    "signature": "clamp(val, min, max)",
    "description": "Returns a value clamped between the specified minimum and maximum.",
    "category": "Maths"
  },
  {
    "name": "clipboard_get_text",
    "signature": "clipboard_get_text()",
    "description": "Returns the current text from the clipboard.",
    "category": "Strings"
  },
  {
    "name": "clipboard_has_text",
    "signature": "clipboard_has_text()",
    "description": "Returns whether there is any text in the clipboard.",
    "category": "Strings"
  },
  {
    "name": "clipboard_set_text",
    "signature": "clipboard_set_text(str)",
    "description": "Returns the current text from the clipboard.",
    "category": "Strings"
  },
  {
    "name": "code_is_compiled",
    "signature": "code_is_compiled()",
    "description": "Check to see if the code was compiled using the YoYo Compiler.",
    "category": "Debugging"
  },
  {
    "name": "collision_circle",
    "signature": "collision_circle( x1, y1, rad, obj, prec, notme )",
    "description": "Checks whether any instances of a given object collides with a circular, user defined area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "collision_ellipse",
    "signature": "collision_ellipse( x1, y1, x2, y2, obj, prec, notme )",
    "description": "Checks whether any instances of a given object collides with a given elliptical area defined by the user.",
    "category": "Movement and Collisions"
  },
  {
    "name": "collision_line",
    "signature": "collision_line( x1, y1, x2, y2, obj, prec, notme )",
    "description": "Checks whether any instances of a given object collide with a given line, and if there is it returns the id of one of those instances.",
    "category": "Movement and Collisions"
  },
  {
    "name": "collision_point",
    "signature": "collision_point( x, y, obj, prec, notme )",
    "description": "Checks a specific, user defined point for a collision with the an instance of the chosen object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "collision_rectangle",
    "signature": "collision_rectangle( x1, y1, x2, y2, obj, prec, notme )",
    "description": "Checks to see whether any instance of a given object collides with a user defined rectangular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "colour_get_blue",
    "signature": "colour_get_blue(col)",
    "description": "Returns the blue component of the colour given.",
    "category": "Drawing"
  },
  {
    "name": "colour_get_green",
    "signature": "colour_get_green(col)",
    "description": "Returns the green component of the colour given.",
    "category": "Drawing"
  },
  {
    "name": "colour_get_hue",
    "signature": "colour_get_hue(col)",
    "description": "Returns the hue of the colour given.",
    "category": "Drawing"
  },
  {
    "name": "colour_get_red",
    "signature": "colour_get_red(col)",
    "description": "Returns the red component of the colour given.",
    "category": "Drawing"
  },
  {
    "name": "colour_get_saturation",
    "signature": "colour_get_saturation(col)",
    "description": "Returns the saturation of the colour given.",
    "category": "Drawing"
  },
  {
    "name": "colour_get_value",
    "signature": "colour_get_value(col)",
    "description": "Returns the value of the colour given.",
    "category": "Drawing"
  },
  {
    "name": "d3d_draw_block",
    "signature": "d3d_draw_block(x1, y1, z1, x2, y2, z2, tex, hrepeat, vrepeat)",
    "description": "Draws a simple 3D block.",
    "category": "Drawing"
  },
  {
    "name": "d3d_draw_cone",
    "signature": "d3d_draw_cone(x1, y1, z1, x2, y2, z2, tex, hrepeat, vrepeat, closed, steps)",
    "description": "Draws a simple 3D cone.",
    "category": "Drawing"
  },
  {
    "name": "d3d_draw_cylinder",
    "signature": "d3d_draw_cylinder(x1, y1, z1, x2, y2, z2, tex, hrepeat, vrepeat, closed, steps)",
    "description": "Draws a simple 3D cylinder.",
    "category": "Drawing"
  },
  {
    "name": "d3d_draw_ellipsoid",
    "signature": "d3d_draw_ellipsoid(x1, y1, z1, x2, y2, z2, tex, hrepeat, vrepeat, closed, steps)",
    "description": "Draws a simple 3D ellipsoid.",
    "category": "Drawing"
  },
  {
    "name": "d3d_draw_floor",
    "signature": "d3d_draw_floor(x1, y1, z1, x2, y2, z2, tex, hrepeat, vrepeat)",
    "description": "Draws a simple 3D floor.",
    "category": "Drawing"
  },
  {
    "name": "d3d_draw_wall",
    "signature": "d3d_draw_wall(x1, y1, z1, x2, y2, z2, tex, hrepeat, vrepeat)",
    "description": "Draws a simple 3D vertical wall.",
    "category": "Drawing"
  },
  {
    "name": "d3d_end",
    "signature": "d3d_end()",
    "description": "Tells GameMaker: Studio that 3D mode is to be switched off.",
    "category": "Drawing"
  },
  {
    "name": "d3d_light_define_ambient",
    "signature": "d3d_light_define_ambient(colour)",
    "description": "Set the colour for the ambient lighting of a 3D scene.",
    "category": "Drawing"
  },
  {
    "name": "d3d_light_define_direction",
    "signature": "d3d_light_define_direction(ind, dx, dy, dz, col)",
    "description": "Defines a directed light.",
    "category": "Drawing"
  },
  {
    "name": "d3d_light_define_point",
    "signature": "d3d_light_define_point(ind, x, y, z, range, col)",
    "description": "Defines a point light.",
    "category": "Drawing"
  },
  {
    "name": "d3d_light_enable",
    "signature": "d3d_light_enable(ind, enable)",
    "description": "Switches on or off the indexed light.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_block",
    "signature": "d3d_model_block(ind, x1, y1, z1, x2, y2, z2, hrepeat, vrepeat)",
    "description": "Adds a block shape to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_clear",
    "signature": "d3d_model_clear(ind)",
    "description": "Clears the model with the given index, removing all its primitives.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_cone",
    "signature": "d3d_model_cone(ind, x1, y1, z1, x2, y2, z2, hrepeat, vrepeat, closed, steps)",
    "description": "Adds a cone shape to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_create",
    "signature": "d3d_model_create()",
    "description": "Creates a new model and returns its index.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_cylinder",
    "signature": "d3d_model_cylinder(ind, x1, y1, z1, x2, y2, z2, hrepeat, vrepeat, closed, steps)",
    "description": "Adds a cylinder shape to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_destroy",
    "signature": "d3d_model_destroy(ind)",
    "description": "Destroys the model with the given index, freeing its memory.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_draw",
    "signature": "d3d_model_draw(ind, x, y, z, texid)",
    "description": "Draws the model at position (x, y, z).",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_ellipsoid",
    "signature": "d3d_model_ellipsoid(ind, x1, y1, z1, x2, y2, z2, hrepeat, vrepeat, steps)",
    "description": "Adds an ellipsoid shape to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_floor",
    "signature": "d3d_model_floor(ind, x1, y1, z1, x2, y2, z2, hrepeat, vrepeat)",
    "description": "Adds a floor shape to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_load",
    "signature": "d3d_model_load(ind, fname)",
    "description": "Loads the model from the indicated file name.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_primitive_begin",
    "signature": "d3d_model_primitive_begin(ind, kind)",
    "description": "Begins the process of defining a primitive that is to be added to a model in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_primitive_end",
    "signature": "d3d_model_primitive_end(ind)",
    "description": "Ends the process of adding primitives to a model in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_save",
    "signature": "d3d_model_save(ind, fname)",
    "description": "Saves the model to the indicated file name.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex",
    "signature": "d3d_model_vertex(ind, x, y, z)",
    "description": "Add vertex (x,y,z) to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_colour",
    "signature": "d3d_model_vertex_colour(ind, x, y, z, col, alpha)",
    "description": "Add vertex (x,y,z) to the model with colour values.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_normal",
    "signature": "d3d_model_vertex_normal(ind, x, y, z, nx, ny, nz)",
    "description": "Defines a vertex for a primitive in 3D along with its corresponding normal.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_normal_colour",
    "signature": "d3d_model_vertex_normal_colour(x, y, z, nx, ny, nz, col, alpha)",
    "description": "Defines a primitive vertex for a model in 3D along with its corresponding normal, colour blending and alpha.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_normal_texture",
    "signature": "d3d_model_vertex_normal_texture(ind, x, y, z, nx, ny, nz, xtex, ytex)",
    "description": "Defines a primitive vertex for a textured model in 3D along with its corresponding normal.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_normal_texture_colour",
    "signature": "d3d_model_vertex_normal_texture_colour(ind, x, y, z, nx, ny, nz, xtex, ytex, col, alpha)",
    "description": "Defines a primitive vertex for a textured model in 3D along with its corresponding normal, colour blending and alpha.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_texture",
    "signature": "d3d_model_vertex_texture(ind, x, y, z, xtex, ytex)",
    "description": "Add vertex (x,y,z) to the model with texture values.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_vertex_texture_colour",
    "signature": "d3d_model_vertex_texture_colour(ind, x, y, z, xtex, ytex)",
    "description": "Add vertex (x,y,z) to the model with texture and colour values.",
    "category": "Drawing"
  },
  {
    "name": "d3d_model_wall",
    "signature": "d3d_model_wall(ind, x1, y1, z1, x2, y2, z2, hrepeat, vrepeat)",
    "description": "Adds a wall shape to the model.",
    "category": "Drawing"
  },
  {
    "name": "d3d_primitive_begin",
    "signature": "d3d_primitive_begin(kind)",
    "description": "Begins the process of defining a primitive in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_primitive_begin_texture",
    "signature": "d3d_primitive_begin_texture(kind, tex)",
    "description": "Begins the process of defining a textured primitive in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_primitive_end",
    "signature": "d3d_primitive_end()",
    "description": "Ends the process of defining a primitive in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_culling",
    "signature": "d3d_set_culling(enable)",
    "description": "Sets whether back face culling should be enabled or disabled.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_depth",
    "signature": "d3d_set_depth(depth)",
    "description": "Sets the depth used for drawing.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_fog",
    "signature": "d3d_set_fog(enable, colour, start, end)",
    "description": "Enables or disables the use of fog.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_hidden",
    "signature": "d3d_set_hidden(enable)",
    "description": "This function is used to enable or disable depth testing.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_lighting",
    "signature": "d3d_set_lighting(enable)",
    "description": "Enables or disables the use of lighting.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_perspective",
    "signature": "d3d_set_perspective(enable)",
    "description": "Switches on or off perspective projection.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_projection",
    "signature": "d3d_set_projection(xfrom, yfrom, zfrom, xto, yto, zto, xup, yup, zup)",
    "description": "This function can be used to modify the view matrix.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_projection_ext",
    "signature": "d3d_set_projection_ext(xfrom, yfrom, zfrom, xto, yto, zto, xup, yup, zup, angle, aspect, znear, zfar)",
    "description": "This function can be used to set very precise 3D projections.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_projection_ortho",
    "signature": "d3d_set_projection_ortho(x, y, w, h, angle)",
    "description": "This function can be used to set an orthographic projection.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_projection_perspective",
    "signature": "d3d_set_projection_perspective(x, y, w, h, angle)",
    "description": "This function can be used to set a perspective projection.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_shading",
    "signature": "d3d_set_shading(smooth)",
    "description": "Set whether to use smooth shading or not.",
    "category": "Drawing"
  },
  {
    "name": "d3d_set_zwriteenable",
    "signature": "d3d_set_zwriteenable(enable)",
    "description": "Enables or disables the z-buffer.",
    "category": "Drawing"
  },
  {
    "name": "d3d_start",
    "signature": "d3d_start()",
    "description": "Tells GameMaker: Studio that all further drawing is to be done in 3D mode.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_add_rotation_axis",
    "signature": "d3d_transform_add_rotation_axis(xa, ya, za, angle)",
    "description": "Sets the transformation to a rotation around the axis indicated by the vector with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_add_rotation_x",
    "signature": "d3d_transform_add_rotation_x(angle)",
    "description": "Adds a rotation around the x-axis with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_add_rotation_y",
    "signature": "d3d_transform_add_rotation_y(angle)",
    "description": "Adds a rotation around the y-axis with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_add_rotation_z",
    "signature": "d3d_transform_add_rotation_z(angle)",
    "description": "Adds a rotation around the z-axis with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_add_scaling",
    "signature": "d3d_transform_add_scaling(xs, ys, zs)",
    "description": "Sets the transformation to a scaling with the indicated amounts.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_add_translation",
    "signature": "d3d_transform_add_translation(xt, yt, zt)",
    "description": "Add a translation over the indicated vector to the transform.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_identity",
    "signature": "d3d_transform_set_identity()",
    "description": "Sets the transformation to the identity (no transformation).",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_rotation_axis",
    "signature": "d3d_transform_set_rotation_axis(xa, ya, za, angle)",
    "description": "Sets the transformation to a rotation around the axis indicated by the vector with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_rotation_x",
    "signature": "d3d_transform_set_rotation_x(angle)",
    "description": "Sets the transformation to a rotation around the x-axis with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_rotation_y",
    "signature": "d3d_transform_set_rotation_y(angle)",
    "description": "Sets the transformation to a rotation around the y-axis with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_rotation_z",
    "signature": "d3d_transform_set_rotation_z(angle)",
    "description": "Sets the transformation to a rotation around the z-axis with the indicated amount.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_scaling",
    "signature": "d3d_transform_set_scaling(xs, ys, zs)",
    "description": "Sets the transformation to a scaling with the indicated amounts.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_set_translation",
    "signature": "d3d_transform_set_translation(xt, yt, zt)",
    "description": "Sets the transformation to a translation over the indicated vector.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_stack_clear",
    "signature": "d3d_transform_stack_clear()",
    "description": "Clears the stack of transformations.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_stack_discard",
    "signature": "d3d_transform_stack_discard()",
    "description": "Removes the top transformation from the stack.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_stack_empty",
    "signature": "d3d_transform_stack_empty()",
    "description": "Returns whether the transformation stack is empty.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_stack_pop",
    "signature": "d3d_transform_stack_pop()",
    "description": "Pops the top transformation from the stack and makes it the current one.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_stack_push",
    "signature": "d3d_transform_stack_push()",
    "description": "Pushes the current transformation onto the stack.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_stack_top",
    "signature": "d3d_transform_stack_top()",
    "description": "Makes the top transformation the current one.",
    "category": "Drawing"
  },
  {
    "name": "d3d_transform_vertex",
    "signature": "d3d_transform_vertex(x, y, z)",
    "description": "Get the x, y and z values of a transformed vertex.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex",
    "signature": "d3d_vertex(x, y, z)",
    "description": "Defines a vertex for a primitive in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex_colour",
    "signature": "d3d_vertex_colour(x, y, z, col, alpha)",
    "description": "Defines a primitive vertex with colour and alpha blending in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex_normal",
    "signature": "d3d_vertex_normal(x, y, z, nx, ny, nz)",
    "description": "Defines a vertex for a primitive in 3D along with its corresponding normal.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex_normal_texture",
    "signature": "d3d_vertex_normal_texture(x, y, z, nx, ny, nz, xtex, ytex)",
    "description": "Defines a vertex for a textured primitive in 3D along with its corresponding normal.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex_normal_texture_colour",
    "signature": "d3d_vertex_normal_texture_colour(x, y, z, nx, ny, nz, xtex, ytex, col, alpha)",
    "description": "Defines a vertex for a textured primitive in 3D along with its corresponding normal, colour blending and alpha.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex_texture",
    "signature": "d3d_vertex_texture(x, y, z, xtex, ytex)",
    "description": "Defines a vertex for a textured primitive in 3D.",
    "category": "Drawing"
  },
  {
    "name": "d3d_vertex_texture_colour",
    "signature": "d3d_vertex_texture_colour(x, y, z, xtex, ytex, col, alpha)",
    "description": "Defines a vertex for a textured primitive in 3D, giving a blend colour and alpha.",
    "category": "Drawing"
  },
  {
    "name": "date_compare_date",
    "signature": "date_compare_date( date1, date2 )",
    "description": "Returns which of two dates is the latest.",
    "category": "Date and Time"
  },
  {
    "name": "date_compare_datetime",
    "signature": "date_compare_datetime(date1, date2)",
    "description": "Returns which of two times on specific dates is the latest.",
    "category": "Date and Time"
  },
  {
    "name": "date_compare_time",
    "signature": "date_compare_time(datetime1, datetime2)",
    "description": "Returns which of two times is the latest.",
    "category": "Date and Time"
  },
  {
    "name": "date_create_datetime",
    "signature": "date_create_datetime(year, month, day, hour, minute, second)",
    "description": "Creates and returns a datetime value based on given values.",
    "category": "Date and Time"
  },
  {
    "name": "date_current_datetime",
    "signature": "date_current_datetime()",
    "description": "Returns the date-time value corresponding to the current moment.",
    "category": "Date and Time"
  },
  {
    "name": "date_date_of",
    "signature": "date_date_of(date)",
    "description": "Returns the date section of a datetime value.",
    "category": "Date and Time"
  },
  {
    "name": "date_date_string",
    "signature": "date_date_string(date)",
    "description": "Returns a string indicating the given date in the default format for the system.",
    "category": "Date and Time"
  },
  {
    "name": "date_datetime_string",
    "signature": "date_datetime_string(date)",
    "description": "Returns a string indicating the given date and time in the default format for the system.",
    "category": "Date and Time"
  },
  {
    "name": "date_day_span",
    "signature": "date_day_span(date1, date2)",
    "description": "Returns the number of days between two datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_days_in_month",
    "signature": "date_days_in_month(date)",
    "description": "Returns the number of days in the month of the given datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_days_in_year",
    "signature": "date_days_in_year(date)",
    "description": "Returns the number of days in the year of the given datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_day",
    "signature": "date_get_day(date)",
    "description": "Returns the day corresponding to the date.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_day_of_year",
    "signature": "date_get_day_of_year( date )",
    "description": "Returns the day of the year corresponding to the date.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_hour",
    "signature": "date_get_hour(date)",
    "description": "Returns the hour corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_hour_of_year",
    "signature": "date_get_hour_of_year(date)",
    "description": "Returns the hour of the year corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_minute",
    "signature": "date_get_minute(date)",
    "description": "Returns the minute corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_minute_of_year",
    "signature": "date_get_minute_of_year(date)",
    "description": "Returns the minute of the year corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_month",
    "signature": "date_get_month(date)",
    "description": "Returns the month corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_second",
    "signature": "date_get_second(date)",
    "description": "Returns the second corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_second_of_year",
    "signature": "date_get_second_of_year( date )",
    "description": "Returns the second of the year corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_timezone",
    "signature": "date_get_timezone()",
    "description": "Sets the base timezone to use for all the date and time functions.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_week",
    "signature": "date_get_week(date)",
    "description": "Returns the week corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_weekday",
    "signature": "date_get_weekday(date)",
    "description": "Returns the weekday corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_get_year",
    "signature": "date_get_year(date)",
    "description": "Returns the year corresponding to the datetime.",
    "category": "Date and Time"
  },
  {
    "name": "date_hour_span",
    "signature": "date_hour_span(date1, date2)",
    "description": "Returns the number of hours between two datetimes.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_day",
    "signature": "date_inc_day(date, amount)",
    "description": "Returns a datetime after a given number of days have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_hour",
    "signature": "date_inc_hour(date, amount)",
    "description": "Returns a datetime after a given number of hours have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_minute",
    "signature": "date_inc_minute( date, amount )",
    "description": "Returns a datetime after a given number of minutes have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_month",
    "signature": "date_inc_month( date, amount )",
    "description": "Returns a datetime after a given number of months have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_second",
    "signature": "date_inc_second(date, amount)",
    "description": "Returns a datetime after a given number of seconds have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_week",
    "signature": "date_inc_week(date, amount)",
    "description": "Returns a datetime after a given number of weeks have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_inc_year",
    "signature": "date_inc_year(date, amount)",
    "description": "Returns a datetime after a given number of years have been added.",
    "category": "Date and Time"
  },
  {
    "name": "date_is_today",
    "signature": "date_is_today(date)",
    "description": "Returns whether the given datetime is today or not.",
    "category": "Date and Time"
  },
  {
    "name": "date_leap_year",
    "signature": "date_leap_year(date)",
    "description": "Returns whether the year in the given datetime is a leap year or not.",
    "category": "Date and Time"
  },
  {
    "name": "date_minute_span",
    "signature": "date_minute_span(date1, date2)",
    "description": "Returns the number of minutes between two datetime, with incomplete ones reporting as a fraction.",
    "category": "Date and Time"
  },
  {
    "name": "date_month_span",
    "signature": "date_month_span(date1, date2)",
    "description": "Returns the number of months between two datetime, with incomplete ones reporting as a fraction.",
    "category": "Date and Time"
  },
  {
    "name": "date_second_span",
    "signature": "date_second_span(date1, date2)",
    "description": "Returns the number of seconds between two datetime values.",
    "category": "Date and Time"
  },
  {
    "name": "date_set_timezone",
    "signature": "date_set_timezone(timezone)",
    "description": "Sets the base timezone to use for all the date and time functions.",
    "category": "Date and Time"
  },
  {
    "name": "date_time_of",
    "signature": "date_time_of(date)",
    "description": "Returns the time section of a datetime value.",
    "category": "Date and Time"
  },
  {
    "name": "date_time_string",
    "signature": "date_time_string( date )",
    "description": "Returns a string indicating the given time in the default format for the system.",
    "category": "Date and Time"
  },
  {
    "name": "date_valid_datetime",
    "signature": "date_valid_datetime(year, month, day, hour, minute, second)",
    "description": "Returns whether a given datetime is valid.",
    "category": "Date and Time"
  },
  {
    "name": "date_week_span",
    "signature": "date_week_span(date1, date2)",
    "description": "Returns the number of weeks between two datetime, with incomplete ones reporting as a fraction.",
    "category": "Date and Time"
  },
  {
    "name": "date_year_span",
    "signature": "date_year_span(date1, date2)",
    "description": "Returns the number of years between two datetime, with incomplete ones reporting as a fraction.",
    "category": "Date and Time"
  },
  {
    "name": "device_get_tilt_x",
    "signature": "device_get_tilt_x()",
    "description": "This function returns the amount of tilt on the x axis of your device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "device_get_tilt_y",
    "signature": "device_get_tilt_y()",
    "description": "This function returns the amount of tilt on the x axis of your device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "device_get_tilt_z",
    "signature": "device_get_tilt_z()",
    "description": "This function returns the amount of tilt on the x axis of your device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "directory_create",
    "signature": "directory_create(dname)",
    "description": "Creates a directory with the given name.",
    "category": "File Handling"
  },
  {
    "name": "directory_destroy",
    "signature": "directory_destroy(dname)",
    "description": "Destroy (delete) a directory with the given name.",
    "category": "File Handling"
  },
  {
    "name": "directory_exists",
    "signature": "directory_exists(dname)",
    "description": "Returns whether the indicated directory exists.",
    "category": "File Handling"
  },
  {
    "name": "display_get_orientation",
    "signature": "display_get_orientation()",
    "description": "This variable holds a different constant depending on the orientation of the device.",
    "category": "Windows And Views"
  },
  {
    "name": "distance_to_object",
    "signature": "distance_to_object( obj )",
    "description": "Returns the distance between the calling instance and the nearest instance of a given object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "distance_to_point",
    "signature": "distance_to_point(x, y)",
    "description": "Returns the distance between the calling instance and a given point, in pixels.",
    "category": "Movement and Collisions"
  },
  {
    "name": "dot_product",
    "signature": "dot_product(x1, y1, x2, y2)",
    "description": "Returns the dot_product of the vectors x1,y1 and x2,y2.",
    "category": "Maths"
  },
  {
    "name": "dot_product_3d",
    "signature": "dot_product_3d(x1, y1, z1, x2, y2, z2)",
    "description": "Returns the dot_product of the vectors x1,y1,z1 and x2,y2,z2.",
    "category": "Maths"
  },
  {
    "name": "dot_product_3d_normalised",
    "signature": "dot_product_3d_normalised(x1, y1, z1, x2, y2, z2)",
    "description": "Returns the normalised dot_product of the vectors x1, y1, z1 and x2, y2, z2.",
    "category": "Maths"
  },
  {
    "name": "dot_product_normalised",
    "signature": "dot_product_normalised(x1, y1, x2, y2)",
    "description": "Returns the normalised dot_product of the vectors x1,y1 and x2,y2.",
    "category": "Maths"
  },
  {
    "name": "draw_arrow",
    "signature": "draw_arrow(x1, y1, x2, y2, size)",
    "description": "Draws an arrow, with a one pixel wide stem and the point defined by the user.",
    "category": "Drawing"
  },
  {
    "name": "draw_background",
    "signature": "draw_background(back, x, y)",
    "description": "Draw a background without colour blending or transparency",
    "category": "Drawing"
  },
  {
    "name": "draw_background_ext",
    "signature": "draw_background_ext(back, x, y, xscale, yscale, rot, colour, alpha)",
    "description": "Draws a background at a given position, with customizable scaling, rotation, blend and alpha.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_general",
    "signature": "draw_background_general(back, left, top, width, height, x, y, xscale, yscale, rot, c1, c2, c3, c4, alpha)",
    "description": "Draws part of a background at a given position with scaling, rotating, four-corner blending and alpha options.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_part",
    "signature": "draw_background_part(back, left, top, width, height, x, y)",
    "description": "Draws part of a background at a given position.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_part_ext",
    "signature": "draw_background_part_ext(back, left, top, width, height, x, y, xscale, yscale, colour, alpha)",
    "description": "Draws part of a background at a given position with scaling, blending and alpha options.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_stretched",
    "signature": "draw_background_stretched(back, x, y, w, h)",
    "description": "Draws a background at a given position, stretched.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_stretched_ext",
    "signature": "draw_background_stretched_ext(back, x, y, w, h, colour, alpha)",
    "description": "Draws a background at a given position, stretched, and allows for a custom blend and alpha.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_tiled",
    "signature": "draw_background_tiled(back, x, y)",
    "description": "Draws a background at a given position, and tiles it to fill the entire view.",
    "category": "Drawing"
  },
  {
    "name": "draw_background_tiled_ext",
    "signature": "draw_background_tiled_ext(back, x, y, xscale, yscale, colour, alpha)",
    "description": "Draws a background at a given position with scaling, blending and alpha, and tiles it to fill the entire view.",
    "category": "Drawing"
  },
  {
    "name": "draw_button",
    "signature": "draw_button(x1, y1, x2, y2, up)",
    "description": "Draws a simple button of any size, either pressed or unpressed.",
    "category": "Drawing"
  },
  {
    "name": "draw_circle",
    "signature": "draw_circle(x, y, r, outline)",
    "description": "Draws a circle.",
    "category": "Drawing"
  },
  {
    "name": "draw_circle_colour",
    "signature": "draw_circle_colour(x, y, r, col1, col2, outline)",
    "description": "Draws a circle of a given size with a two-colour radial gradient.",
    "category": "Drawing"
  },
  {
    "name": "draw_clear",
    "signature": "draw_clear(col)",
    "description": "Clears the entire screen with colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_clear_alpha",
    "signature": "draw_clear_alpha(col, alpha)",
    "description": "Clears the entire screen with an alpha-blended given colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_ellipse",
    "signature": "draw_ellipse(x1, y1, x2, y2, outline)",
    "description": "Draws an ellipse.",
    "category": "Drawing"
  },
  {
    "name": "draw_ellipse_colour",
    "signature": "draw_ellipse_colour(x1, y1, x2, y2, col1, col2, outline)",
    "description": "Draws an ellipse with a two-colour radial gradient.",
    "category": "Drawing"
  },
  {
    "name": "draw_enable_alphablend",
    "signature": "draw_enable_alphablend(val)",
    "description": "Toggles alpha blending on or off.",
    "category": "Drawing"
  },
  {
    "name": "draw_enable_drawevent",
    "signature": "draw_enable_drawevent(enable)",
    "description": "Enables or disables the draw event.",
    "category": "Drawing"
  },
  {
    "name": "draw_enable_swf_aa",
    "signature": "draw_enable_swf_aa(enable)",
    "description": "Enable or disable anti-aliasing for SWF format vector sprites.",
    "category": "Drawing"
  },
  {
    "name": "draw_get_alpha",
    "signature": "draw_get_alpha()",
    "description": "Gets the current draw alpha value.",
    "category": "Drawing"
  },
  {
    "name": "draw_get_alpha_test",
    "signature": "draw_get_alpha_test()",
    "description": "Returns the current state of alpha testing (enabled or not).",
    "category": "Drawing"
  },
  {
    "name": "draw_get_alpha_test_ref_value",
    "signature": "draw_get_alpha_test_ref_value()",
    "description": "Returns the current alpha testing reference value.",
    "category": "Drawing"
  },
  {
    "name": "draw_get_colour",
    "signature": "draw_get_colour()",
    "description": "Gets the current draw colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_get_swf_aa_level",
    "signature": "draw_get_swf_aa_level()",
    "description": "Get the current anti-aliasing level for SWF format vector sprites.",
    "category": "Drawing"
  },
  {
    "name": "draw_getpixel",
    "signature": "draw_getpixel(x, y)",
    "description": "Returns the colour of the pixel displayed at a given coordinate.",
    "category": "Drawing"
  },
  {
    "name": "draw_getpixel_ext",
    "signature": "draw_getpixel_ext(x, y)",
    "description": "Returns the full 32bit value for the pixel displayed at a given coordinate.",
    "category": "Drawing"
  },
  {
    "name": "draw_healthbar",
    "signature": "draw_healthbar(x1, y1, x2, y2, amount, backcol, mincol, maxcol, direction, showback, showborder)",
    "description": "Draws a custom healthbar.",
    "category": "Drawing"
  },
  {
    "name": "draw_highscore",
    "signature": "draw_highscore( x1, y1, x2, y2 )",
    "description": "Draws the highscore table string in the room filling the indicated box size using the currently set font and draw colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_line",
    "signature": "draw_line(x1, y1, x2, y2)",
    "description": "Draws a line one pixel wide.",
    "category": "Drawing"
  },
  {
    "name": "draw_line_colour",
    "signature": "draw_line_colour(x1, y1, x2, y2, col1, col2)",
    "description": "Draws a line one pixel wide with a colour gradient.",
    "category": "Drawing"
  },
  {
    "name": "draw_line_width",
    "signature": "draw_line_width(x1, y1, x2, y2, w)",
    "description": "Draws a line a defined number of pixels wide.",
    "category": "Drawing"
  },
  {
    "name": "draw_line_width_colour",
    "signature": "draw_line_width_colour(x1, y1, x2, y2, w, col1, col2)",
    "description": "Draws a line any number of pixels wide with a gradient colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_path",
    "signature": "draw_path(path, x, y, absolute)",
    "description": "Draws a path resource.",
    "category": "Drawing"
  },
  {
    "name": "draw_point",
    "signature": "draw_point(x, y)",
    "description": "Draws a single pixel.",
    "category": "Drawing"
  },
  {
    "name": "draw_point_colour",
    "signature": "draw_point_colour(x, y, col1)",
    "description": "Draws a single pixel in a given colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_primitive_begin",
    "signature": "draw_primitive_begin(kind)",
    "description": "Starts a primitive of the indicated kind",
    "category": "Drawing"
  },
  {
    "name": "draw_primitive_begin_texture",
    "signature": "draw_primitive_begin_texture(kind, tex)",
    "description": "Begins the process of defining a textured primitive.",
    "category": "Drawing"
  },
  {
    "name": "draw_primitive_end",
    "signature": "draw_primitive_end()",
    "description": "Ends the process of defining a primitive and draws it.",
    "category": "Drawing"
  },
  {
    "name": "draw_rectangle",
    "signature": "draw_rectangle(x1, y1, x2, y2, outline)",
    "description": "Draws a rectangle.",
    "category": "Drawing"
  },
  {
    "name": "draw_rectangle_colour",
    "signature": "draw_rectangle_colour(x1, y1, x2, y2, col1, col2, col3, col4, outline)",
    "description": "Draws a rectangle, either as a one pixel outline or filled-in, with each of the four corners a separate colour (creating a gradient across the shape).",
    "category": "Drawing"
  },
  {
    "name": "draw_roundrect",
    "signature": "draw_roundrect(x1, y1, x2, y2, outline)",
    "description": "Draws a rectangle with rounded corners of a fixed radius.",
    "category": "Drawing"
  },
  {
    "name": "draw_roundrect_colour",
    "signature": "draw_roundrect_colour(x1, y1, x2, y2, col1, col2, outline)",
    "description": "Draws a rectangle with rounded corners of a fixed radius, colouring it with a gradient of two colours.",
    "category": "Drawing"
  },
  {
    "name": "draw_roundrect_colour_ext",
    "signature": "draw_roundrect_colour_ext(x1, y1, x2, y2, xrad, yrad, col1, col2, outline)",
    "description": "Draws a rectangle with rounded corners of the given radius, colouring it with a gradient of two colours.",
    "category": "Drawing"
  },
  {
    "name": "draw_roundrect_ext",
    "signature": "draw_roundrect_ext(x1, y1, x2, y2, xrad, yrad, outline)",
    "description": "Draws a rectangle with rounded corners of the given radius.",
    "category": "Drawing"
  },
  {
    "name": "draw_self",
    "signature": "draw_self()",
    "description": "This draws the instance sprite the same as the default draw.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_alpha",
    "signature": "draw_set_alpha(alpha)",
    "description": "Sets the base alpha blend for the draw functions.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_alpha_test",
    "signature": "draw_set_alpha_test(enable)",
    "description": "Enable or disable alpha testing in your game.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_alpha_test_ref_value",
    "signature": "draw_set_alpha_test_ref_value(value)",
    "description": "Sets the reference value used by the alpha testing.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_blend_mode",
    "signature": "draw_set_blend_mode( mode )",
    "description": "Sets the blend mode for drawing.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_blend_mode_ext",
    "signature": "draw_set_blend_mode_ext(src, dest)",
    "description": "Sets an extended blend mode for drawing.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_circle_precision",
    "signature": "draw_set_circle_precision(precision)",
    "description": "Sets the precision for drawing a circle or ellipse.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_colour",
    "signature": "draw_set_colour(col)",
    "description": "Sets the base colour for the draw functions.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_colour_write_enable",
    "signature": "draw_set_colour_write_enable(red, green, blue, alpha)",
    "description": "Enable or disable separate channels for drawing.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_font",
    "signature": "draw_set_font(font)",
    "description": "Sets the font used to draw text.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_halign",
    "signature": "draw_set_halign(halign)",
    "description": "Aligns any subsequently drawn text horizontally.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_swf_aa_level",
    "signature": "draw_set_swf_aa_level(AA)",
    "description": "Set the anti-aliasing level for SWF format vector sprites.",
    "category": "Drawing"
  },
  {
    "name": "draw_set_valign",
    "signature": "draw_set_valign(valign)",
    "description": "Aligns any subsequently drawn text vertically.",
    "category": "Drawing"
  },
  {
    "name": "draw_skeleton",
    "signature": "draw_skeleton(sprite, animname, skinname, frame, x, y, xscale, yscale, rot, colour, alpha)",
    "description": "Draws a frame from a given skeletal animation using sprite transforms.",
    "category": "Drawing"
  },
  {
    "name": "draw_skeleton_collision",
    "signature": "draw_skeleton_collision(sprite, animname, frame, x, y, xscale, yscale, rot, colour)",
    "description": "Draws the collision masks for a given frame of a skeletal animation with transforms.",
    "category": "Drawing"
  },
  {
    "name": "draw_skeleton_time",
    "signature": "draw_skeleton_time(sprite, animname, skinname, time, x, y, xscale, yscale, rot, colour)",
    "description": "Draws the skeletal animation sprite at a specific time-frame.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite",
    "signature": "draw_sprite(sprite, subimg, x, y)",
    "description": "Draws a sprite at a given position.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_ext",
    "signature": "draw_sprite_ext( sprite, subimg, x, y, xscale, yscale, rot, colour, alpha )",
    "description": "Draws a sprite at a given position, with customizable scaling, rotation, blend and alpha.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_general",
    "signature": "draw_sprite_general(sprite, subimg, left, top, width, height, x, y, xscale, yscale, rot, c1, c2, c3, c4, alpha)",
    "description": "Draws a part of a given sprite with options for scaling, blending and rotation.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_part",
    "signature": "draw_sprite_part(sprite, subimg, left, top, width, height, x, y)",
    "description": "Draws part of a sprite at a given position.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_part_ext",
    "signature": "draw_sprite_part_ext(sprite, subimg, left, top, width, height, x, y, xscale, yscale, colour, alpha)",
    "description": "Draws part of a sprite at a given position with scaling, blending and alpha options.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_pos",
    "signature": "draw_sprite_pos(sprite, subimg, x1, y1, x2, y2, x3, y3, x4, y4, alpha)",
    "description": "Draws a sprite stretched between four given points and with an alpha blend.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_stretched",
    "signature": "draw_sprite_stretched(sprite, subimg, x, y, w, h)",
    "description": "Draws a sprite at a given position, stretched.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_stretched_ext",
    "signature": "draw_sprite_stretched_ext(sprite, subimg, x, y, w, h, colour, alpha)",
    "description": "Draws a sprite at a given position, stretched, and allows for a custom blend and alpha. This function ignores the sprite's origin.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_tiled",
    "signature": "draw_sprite_tiled(sprite, subimg, x, y)",
    "description": "Draws a sprite at a given position, and tiles it to fill the entire view.",
    "category": "Drawing"
  },
  {
    "name": "draw_sprite_tiled_ext",
    "signature": "draw_sprite_tiled_ext(sprite, subimg, x, y, xscale, yscale, colour, alpha)",
    "description": "Draws a sprite at a given position with scaling, blending and alpha, and tiles it to fill the entire view.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface",
    "signature": "draw_surface(id, x, y)",
    "description": "Draws the surface at a given position.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_ext",
    "signature": "draw_surface_ext(id, x, y, xscale, yscale, rot, colour, alpha)",
    "description": "Draws a surface with custom scaling, rotation, blending and alpha.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_general",
    "signature": "draw_surface_general(id, left, top, w, h, x, y, xscale, yscale, rot, c1, c2, c3, c4, alpha)",
    "description": "Draws part of a surface at a given position with scaling, rotating, four-corner blending and alpha options.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_part",
    "signature": "draw_surface_part(id, left, top, w, h, x, y )",
    "description": "Draws part of a surface.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_part_ext",
    "signature": "draw_surface_part_ext(id, left, top, w, h, x, y, xscale, yscale, colour, alpha)",
    "description": "Draws part of a surface but now with scale factors, colour blending and transparency settings.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_stretched",
    "signature": "draw_surface_stretched(id, x, y, w, h)",
    "description": "Draws the surface stretched to an indicated region.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_stretched_ext",
    "signature": "draw_surface_stretched_ext(id, x, y, w, h, colour, alpha )",
    "description": "Draws the surface stretched to an indicated region with colour and alpha blending.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_tiled",
    "signature": "draw_surface_tiled(id, x, y)",
    "description": "Draws a surface tiled so that it fills the entire room.",
    "category": "Drawing"
  },
  {
    "name": "draw_surface_tiled_ext",
    "signature": "draw_surface_tiled_ext(id, x, y, xscale, yscale, colour, alpha)",
    "description": "Draws a surface at a given position with scaling, blending and alpha, and tiles it to fill the entire room.",
    "category": "Drawing"
  },
  {
    "name": "draw_text",
    "signature": "draw_text(x, y, string)",
    "description": "Draw a string at a given position.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_colour",
    "signature": "draw_text_colour(x, y, string, c1, c2, c3, c4, alpha)",
    "description": "Draw a string at a given position with a colour gradient.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_ext",
    "signature": "draw_text_ext(x, y, string, sep, w)",
    "description": "Draws a string at a given position with a specific spacing and within a limited area.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_ext_colour",
    "signature": "draw_text_ext_colour(x, y, string, sep, w, c1, c2, c3, c4, alpha)",
    "description": "Draws a string with custom spacing and colours.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_ext_transformed",
    "signature": "draw_text_ext_transformed(x, y, string, sep, w, xscale, yscale, angle)",
    "description": "Draws a string with custom spacing and scaling.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_ext_transformed_colour",
    "signature": "draw_text_ext_transformed_colour(x, y, string, sep, w, xscale, yscale, angle, c1, c2, c3, c4, alpha)",
    "description": "Draws a string with any given colour, scale, angle or spacing attributes that you define.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_transformed",
    "signature": "draw_text_transformed(x, y, string, xscale, yscale, angle)",
    "description": "Draws a string with scaling and rotation.",
    "category": "Drawing"
  },
  {
    "name": "draw_text_transformed_colour",
    "signature": "draw_text_transformed_colour(x, y, string, xscale, yscale, angle, c1, c2, c3, c4, alpha)",
    "description": "Draws a string with scaling and colour.",
    "category": "Drawing"
  },
  {
    "name": "draw_texture_flush",
    "signature": "draw_texture_flush()",
    "description": "Clears all textures from texture memory.",
    "category": "Drawing"
  },
  {
    "name": "draw_triangle",
    "signature": "draw_triangle(x1, y1, x2, y2, x3, y3, outline)",
    "description": "Draws a triangle using three defined points.",
    "category": "Drawing"
  },
  {
    "name": "draw_triangle_colour",
    "signature": "draw_triangle_colour(x1, y1, x2, y2, x3, y3, col1, col2, col3, outline)",
    "description": "Draws a triangle of any shape and size, with separate colours assigned to each of its three corners.",
    "category": "Drawing"
  },
  {
    "name": "draw_vertex",
    "signature": "draw_vertex(x, y)",
    "description": "Defines a vertex for a primitive.",
    "category": "Drawing"
  },
  {
    "name": "draw_vertex_colour",
    "signature": "draw_vertex_colour(x, y, col, alpha)",
    "description": "Defines a primitive vertex with colour and alpha blending.",
    "category": "Drawing"
  },
  {
    "name": "draw_vertex_texture",
    "signature": "draw_vertex_texture(x, y, xtex, ytex)",
    "description": "Defines a vertex for a textured primitive.",
    "category": "Drawing"
  },
  {
    "name": "draw_vertex_texture_colour",
    "signature": "draw_vertex_texture_colour(x, y, xtex, ytex, col, alpha)",
    "description": "Defines a vertex for a textured primitive in 3D, giving a blend colour and alpha.",
    "category": "Drawing"
  },
  {
    "name": "ds_exists",
    "signature": "ds_exists(ind, type)",
    "description": "Check to see if a data structure of a given type exists.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_add",
    "signature": "ds_grid_add(index, x, y, val)",
    "description": "Adds a value to a cell in a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_add_disk",
    "signature": "ds_grid_add_disk(index, xm, ym, r, val)",
    "description": "Adds to all the cells in a circular region in a grid to an indicated value (can both be a number or a string).",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_add_grid_region",
    "signature": "ds_grid_add_grid_region(index, source, x1, y1, x2, y2, xpos, ypos)",
    "description": "Adds the contents of the cells in a source grid to the cells in a destination grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_add_region",
    "signature": "ds_grid_add_region(index, x1, y1, x2, y2, val)",
    "description": "Adds the given value to all cells in a region.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_clear",
    "signature": "ds_grid_clear(index, val)",
    "description": "Clears the grid with the given id to an indicated value.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_copy",
    "signature": "ds_grid_copy(destination, source)",
    "description": "Copies one grid into another grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_create",
    "signature": "ds_grid_create(w, h)",
    "description": "Creates a new grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_destroy",
    "signature": "ds_grid_destroy(index)",
    "description": "Destroys a grid, freeing the memory used.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get",
    "signature": "ds_grid_get(index, x, y)",
    "description": "Returns the value of a cell in a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_disk_max",
    "signature": "ds_grid_get_disk_max(index, xm, ym, r)",
    "description": "Gets the maximum from all the values within a circular region.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_disk_mean",
    "signature": "ds_grid_get_disk_mean(index, xm, ym, r)",
    "description": "Gets the mean value from all the values within a circular region.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_disk_min",
    "signature": "ds_grid_get_disk_min(index, xm, ym, r)",
    "description": "Gets the minimum from all the values within a circular region. Only works when the cells are numbers.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_disk_sum",
    "signature": "ds_grid_get_disk_sum(index, xm, ym, r)",
    "description": "Gets the sum of all the values within a circular region. Only works when the cells are numbers.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_max",
    "signature": "ds_grid_get_max(index, x1, y1, x2, y2)",
    "description": "Returns the max value from all the cells within a region on a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_mean",
    "signature": "ds_grid_get_mean(index, x1, y1, x2, y2)",
    "description": "Returns the mean value of all the cells within a region on a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_min",
    "signature": "ds_grid_get_min(index, x1, y1, x2, y2)",
    "description": "Returns the min value from all the cells within a region on a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_get_sum",
    "signature": "ds_grid_get_sum(index, x1, y1, x2, y2)",
    "description": "Returns the sum of all the cells within a region on a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_height",
    "signature": "ds_grid_height(index)",
    "description": "Finds the height of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_multiply",
    "signature": "ds_grid_multiply(index, x, y, val)",
    "description": "Multiplies the value of a given grid cell by a given amount.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_multiply_disk",
    "signature": "ds_grid_multiply_disk(index, xm, ym, r, val)",
    "description": "Multiply all the values contained within the disc region by a given amount.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_multiply_grid_region",
    "signature": "ds_grid_multiply_grid_region(index, source, x1, y1, x2, y2, xpos, ypos)",
    "description": "Multiplies the contents of the cells in a source grid with the cells in a destination grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_multiply_region",
    "signature": "ds_grid_multiply_region(index, x1, y1, x2, y2, val)",
    "description": "Multiplies all the values found in the given region by a given amount.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_read",
    "signature": "ds_grid_read(index, string [, legacy])",
    "description": "Reads the grid data structure from a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_resize",
    "signature": "ds_grid_resize(index, w, h)",
    "description": "Resizes the grid to a new width and height.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_set",
    "signature": "ds_grid_set(index, x, y, value)",
    "description": "Sets a cell in a grid to a given value.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_set_disk",
    "signature": "ds_grid_set_disk(index, xm, ym, r, val)",
    "description": "Sets all the cells in a circular region in a grid to an indicated value.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_set_grid_region",
    "signature": "ds_grid_set_grid_region(index, source, x1, y1, x2, y2, xpos, ypos)",
    "description": "Copies the contents of the cells in a source grid to a destination grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_set_region",
    "signature": "ds_grid_set_region(index, x1, y1, x2, y2, val)",
    "description": "Sets the all cells in the region in the grid with the given id, to the indicated value (can both be a number or a string).",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_shuffle",
    "signature": "ds_grid_shuffle(index)",
    "description": "Shuffles all the positions in a grid so that they end up in a random order.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_sort",
    "signature": "ds_grid_sort(index, column, ascending)",
    "description": "Sort a grid according to the values of a given column.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_value_disk_exists",
    "signature": "ds_grid_value_disk_exists(index, xm, ym, r, val)",
    "description": "Finds whether a value exists within a circular region off a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_value_disk_x",
    "signature": "ds_grid_value_disk_x(index, xm, ym, r, val)",
    "description": "Finds the x position of a value found within a circular region of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_value_disk_y",
    "signature": "ds_grid_value_disk_y(index, xm, ym, r, val)",
    "description": "Finds the y position of a value found within a circular region of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_value_exists",
    "signature": "ds_grid_value_exists(index, x1, y1, x2, y2, val)",
    "description": "Finds whether a certain value appears in a region of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_value_x",
    "signature": "ds_grid_value_x(index, x1, y1, x2, y2, val)",
    "description": "Returns the x position of a value within a region of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_value_y",
    "signature": "ds_grid_value_y(index, x1, y1, x2, y2, val)",
    "description": "Returns the y position of a value within a region of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_width",
    "signature": "ds_grid_width(index)",
    "description": "Returns the width of a grid.",
    "category": "Data Structures"
  },
  {
    "name": "ds_grid_write",
    "signature": "ds_grid_write(index)",
    "description": "Turns a data structure into a string and returns this string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_add",
    "signature": "ds_list_add(id, val1 [, val2, ... val15])",
    "description": "Adds the given value (or values) to the end of the list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_clear",
    "signature": "ds_list_clear(id)",
    "description": "Clears all of the data from a given list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_copy",
    "signature": "ds_list_copy( id, source )",
    "description": "Copies one list into another.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_create",
    "signature": "ds_list_create()",
    "description": "Creates a new list, returning its id.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_delete",
    "signature": "ds_list_delete(id, pos)",
    "description": "Deletes the value at a given position in the list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_destroy",
    "signature": "ds_list_destroy(id)",
    "description": "Destroys a given list and removes it from memory.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_empty",
    "signature": "ds_list_empty(id)",
    "description": "Returns whether the given list is empty or not.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_find_index",
    "signature": "ds_list_find_index(id, val)",
    "description": "Finds the position of a given value in the list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_find_value",
    "signature": "ds_list_find_value(id, pos)",
    "description": "Finds the value held at a given position in the list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_insert",
    "signature": "ds_list_insert(id, pos, val)",
    "description": "Inserts the given value to any position in the list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_mark_as_list",
    "signature": "ds_list_mark_as_list(id, pos)",
    "description": "",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_mark_as_map",
    "signature": "ds_list_mark_as_map(id, pos)",
    "description": "",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_read",
    "signature": "ds_list_read(id, str [, legacy])",
    "description": "Reads the list data structure from a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_replace",
    "signature": "ds_list_replace(id, pos, val)",
    "description": "Replaces the value to any position in the list with a given other value.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_set",
    "signature": "ds_list_set(id, pos, val)",
    "description": "Sets a given list position to a value.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_shuffle",
    "signature": "ds_list_shuffle(id)",
    "description": "Shuffles the values in the given list to a random order.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_size",
    "signature": "ds_list_size(id)",
    "description": "Returns the number of values stored in the given list.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_sort",
    "signature": "ds_list_sort(id, ascend)",
    "description": "Sorts the values in the list according to their size, either ascending or descending.",
    "category": "Data Structures"
  },
  {
    "name": "ds_list_write",
    "signature": "ds_list_write(id)",
    "description": "Writes the data structure out as a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_map_add",
    "signature": "ds_map_add(id, key, val)",
    "description": "Adds the given value and associated key into the map.",
    "category": "Data Structures"
  },
  {
    "name": "ds_map_copy",
    "signature": "ds_map_copy(id, source)",
    "description": "Copies the contents of an entire map into another id.",
    "category": "Data Structures"
  },
  {
    "name": "ds_map_create",
    "signature": "ds_map_create()",
    "description": "Creates a new ds_map.",
    "category": "Data Structures"
  },
  {
    "name": "ds_map_delete",
    "signature": "ds_map_delete(id, key)",
    "description": "Deletes the key from the ds_map.",
    "category": "Data Structures"
  },
  {
    "name": "ds_map_empty",
    "signature": "ds_map_empty(id)",
    "description": "Returns whether the given map is empty of key/value pairs or not.",
    "category": "Data Structures"
  },
  {
    "name": "ds_map_find_last",
    "signature": "ds_map_find_last(id)",
    "description": "Finds and returns the last key, as stored by the computer, in the ds_map.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_add",
    "signature": "ds_priority_add(id, val, priority)",
    "description": "Adds a prioritized value to the queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_change_priority",
    "signature": "ds_priority_change_priority(id, val, priority)",
    "description": "Changes the priority of the given value in the priority queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_clear",
    "signature": "ds_priority_clear(id)",
    "description": "Clears all of the data from a given priority queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_copy",
    "signature": "ds_priority_copy(id, source)",
    "description": "Copies a priority queue to another.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_create",
    "signature": "ds_priority_create()",
    "description": "Creates a new priority queue, returning its id.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_delete_max",
    "signature": "ds_priority_delete_max(id)",
    "description": "Returns the value in the priority queue with the largest priority, and deletes it.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_delete_min",
    "signature": "ds_priority_delete_min(id)",
    "description": "Returns the value in the priority queue with the smallest priority, and deletes it.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_delete_value",
    "signature": "ds_priority_delete_value(id,val)",
    "description": "Deletes the given value (along with its priority) from the priority queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_destroy",
    "signature": "ds_priority_destroy(id)",
    "description": "Destroys a given priority queue and removes it from memory.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_empty",
    "signature": "ds_priority_empty(id)",
    "description": "Returns whether the given priority queue is empty or not.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_find_max",
    "signature": "ds_priority_find_max(id)",
    "description": "Returns the value in the priority queue with the largest priority.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_find_min",
    "signature": "ds_priority_find_min(id)",
    "description": "Returns the value in the priority queue with the smallest priority without deleting it.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_find_priority",
    "signature": "ds_priority_find_priority(id, val)",
    "description": "Finds and returns the priority of the given value in the priority queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_read",
    "signature": "ds_priority_read(id, str [, legacy])",
    "description": "Reads the priority queue data structure from a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_size",
    "signature": "ds_priority_size(id)",
    "description": "Returns the number of values stored in the given priority queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_priority_write",
    "signature": "ds_priority_write(id)",
    "description": "Writes the data structure to a returned string. This enables the structure to be saved in something like an .ini file for future use.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_clear",
    "signature": "ds_queue_clear(id)",
    "description": "Clears all of the data from a given queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_copy",
    "signature": "ds_queue_copy(id, source)",
    "description": "Copies the contents of one queue to another.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_create",
    "signature": "ds_queue_create()",
    "description": "Creates a new queue, returning its id.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_dequeue",
    "signature": "ds_queue_dequeue(id)",
    "description": "Dequeues the value from the head of the queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_destroy",
    "signature": "ds_queue_destroy(id)",
    "description": "Destroys a given queue and removes it from memory.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_empty",
    "signature": "ds_queue_empty(id)",
    "description": "Returns whether the given queue is empty or not.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_enqueue",
    "signature": "ds_queue_enqueue(id, val [, val2, ... val15])",
    "description": "Adds the given value (or values) into the given queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_head",
    "signature": "ds_queue_head(id)",
    "description": "Reads the value from the head of the queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_read",
    "signature": "ds_queue_read(id, str [, legacy])",
    "description": "Reads a queue data structure from a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_size",
    "signature": "ds_queue_size(id)",
    "description": "Returns the number of values stored in the given queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_tail",
    "signature": "ds_queue_tail(id)",
    "description": "Reads the value from the tail of the queue.",
    "category": "Data Structures"
  },
  {
    "name": "ds_queue_write",
    "signature": "ds_queue_write(id)",
    "description": "Writes the data structure out as a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_set_precision",
    "signature": "ds_set_precision(prec)",
    "description": "Sets the precision used for comparisons.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_clear",
    "signature": "ds_stack_clear(id)",
    "description": "Clears all of the data from a given stack.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_copy",
    "signature": "ds_stack_copy(id, source)",
    "description": "Copies the contents of one stack to another.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_create",
    "signature": "ds_stack_create()",
    "description": "Creates a new stack, returning its id.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_destroy",
    "signature": "ds_stack_destroy(id)",
    "description": "Destroys a given stack and removes it from memory.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_empty",
    "signature": "ds_stack_empty(id)",
    "description": "Returns whether the given stack is empty or not.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_pop",
    "signature": "ds_stack_pop(id)",
    "description": "Pops the value from the top of the stack.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_push",
    "signature": "ds_stack_push(id, val [, val2, ... val15])",
    "description": "Pushes a given value (or values) onto the top of the stack.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_read",
    "signature": "ds_stack_read(id, str [, legacy] )",
    "description": "Reads a stack data structure from a string.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_size",
    "signature": "ds_stack_size(id)",
    "description": "Returns the number of values stored in the given stack.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_top",
    "signature": "ds_stack_top(id)",
    "description": "Reads the value from the top of the stack.",
    "category": "Data Structures"
  },
  {
    "name": "ds_stack_write",
    "signature": "ds_stack_write(id)",
    "description": "Writes the data structure out as a string.",
    "category": "Data Structures"
  },
  {
    "name": "effect_clear",
    "signature": "effect_clear()",
    "description": "Clears all effects created using the in-built particle system.",
    "category": "Particles"
  },
  {
    "name": "effect_create_above",
    "signature": "effect_create_above(kind, x, y, size, colour)",
    "description": "Creates a simple particle effect above all instances.",
    "category": "Particles"
  },
  {
    "name": "effect_create_below",
    "signature": "effect_create_below(kind, x, y, size, colour)",
    "description": "Creates a simple particle effect beneath all instances.",
    "category": "Particles"
  },
  {
    "name": "environment_get_variable",
    "signature": "environment_get_variable(name)",
    "description": "Returns the value of the given environment variable.",
    "category": "Miscellaneous"
  },
  {
    "name": "event_inherited",
    "signature": "event_inherited()",
    "description": "Performs the inherited event.",
    "category": "Objects and Instances"
  },
  {
    "name": "event_user",
    "signature": "event_user(numb)",
    "description": "Calls one of the 16 user-defined events.",
    "category": "Objects and Instances"
  },
  {
    "name": "external_call",
    "signature": "external_call(id, args[0...15])",
    "description": "Call a previously defined external function.",
    "category": "Miscellaneous"
  },
  {
    "name": "external_define",
    "signature": "external_define(dll, name, calltype, restype, argnumb, argtype[0], argtype[1], ...argtype[10]) ",
    "description": "Defines an external function.",
    "category": "Miscellaneous"
  },
  {
    "name": "external_free",
    "signature": "external_free(id)",
    "description": "Frees the DLL with the given name.",
    "category": "Miscellaneous"
  },
  {
    "name": "file_attributes",
    "signature": "file_attributes(fname, attr)",
    "description": "Gives you the attributes of a file.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_close",
    "signature": "file_bin_close(binfile)",
    "description": "This closes the file indexed in the given file name id.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_open",
    "signature": "file_bin_open(fname, mode)",
    "description": "Opens the file with the indicated name.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_position",
    "signature": "file_bin_position(binfile)",
    "description": "Returns the current position (in bytes; 0 is the first position) of the file with the given file id.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_read_byte",
    "signature": "file_bin_read_byte(binfile)",
    "description": "Reads a byte of data from a binary file.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_rewrite",
    "signature": "file_bin_rewrite(binfile)",
    "description": "Re-writes the given file.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_seek",
    "signature": "file_bin_seek(binfile, pos)",
    "description": "Moves the current position of the file to the indicated position.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_size",
    "signature": "file_bin_size(binfile)",
    "description": "Returns the size (in bytes) of the file with the given file id.",
    "category": "File Handling"
  },
  {
    "name": "file_bin_write_byte",
    "signature": "file_bin_write_byte(binfile, byte)",
    "description": "Writes a byte of data to the file with the given file id.",
    "category": "File Handling"
  },
  {
    "name": "file_copy",
    "signature": "file_copy(fname, newname)",
    "description": "Copy a given file.",
    "category": "File Handling"
  },
  {
    "name": "file_delete",
    "signature": "file_delete(fname)",
    "description": "Deletes a given file.",
    "category": "File Handling"
  },
  {
    "name": "file_exists",
    "signature": "file_exists(fname)",
    "description": "Returns whether a given file exists or not.",
    "category": "File Handling"
  },
  {
    "name": "file_find_close",
    "signature": "file_find_close()",
    "description": "Frees memory after file searching.",
    "category": "File Handling"
  },
  {
    "name": "file_find_first",
    "signature": "file_find_first(mask, attr)",
    "description": "Returns the name of the first file that satisfies the mask and the attributes.",
    "category": "File Handling"
  },
  {
    "name": "file_find_next",
    "signature": "file_find_next()",
    "description": "Returns the name of the next file that satisfies the mask and the attributes.",
    "category": "File Handling"
  },
  {
    "name": "file_rename",
    "signature": "file_rename(oldname, newname)",
    "description": "Renames a given file.",
    "category": "File Handling"
  },
  {
    "name": "file_text_close",
    "signature": "file_text_close(fileid)",
    "description": "Closes a given opened text file.",
    "category": "File Handling"
  },
  {
    "name": "file_text_eof",
    "signature": "file_text_eof(fileid)",
    "description": "Check the current read position of a file to see if the end has been reached.",
    "category": "File Handling"
  },
  {
    "name": "file_text_eoln",
    "signature": "file_text_eoln(fileid)",
    "description": "Checks to see if the end of the line being read from a text file has been reached.",
    "category": "File Handling"
  },
  {
    "name": "file_text_open_append",
    "signature": "file_text_open_append(fname)",
    "description": "Opens the text file with the indicated filename for appending.",
    "category": "File Handling"
  },
  {
    "name": "file_text_open_from_string",
    "signature": "file_text_open_from_string(string)",
    "description": "Creates a temporary text file from a string for reading.",
    "category": "File Handling"
  },
  {
    "name": "file_text_open_read",
    "signature": "file_text_open_read(fname)",
    "description": "Opens the text file with the indicated filename for reading.",
    "category": "File Handling"
  },
  {
    "name": "file_text_open_write",
    "signature": "file_text_open_write(fname)",
    "description": "Opens the text file with the indicated filename for writing.",
    "category": "File Handling"
  },
  {
    "name": "file_text_read_real",
    "signature": "file_text_read_real(fileid)",
    "description": "Reads real value from a given opened text file.",
    "category": "File Handling"
  },
  {
    "name": "file_text_read_string",
    "signature": "file_text_read_string(fileid)",
    "description": "Reads a string from a given opened text file.",
    "category": "File Handling"
  },
  {
    "name": "file_text_readln",
    "signature": "file_text_readln(fileid)",
    "description": "Goes to the next line of the text file",
    "category": "File Handling"
  },
  {
    "name": "file_text_write_real",
    "signature": "file_text_write_real(fileid, val)",
    "description": "Writes a real value to a given opened text file.",
    "category": "File Handling"
  },
  {
    "name": "file_text_write_string",
    "signature": "file_text_write_string(fileid, str)",
    "description": "Writes a string to a given opened text file.",
    "category": "File Handling"
  },
  {
    "name": "file_text_writeln",
    "signature": "file_text_writeln(fileid)",
    "description": "Writes a new line to a given opened text file.",
    "category": "File Handling"
  },
  {
    "name": "filename_change_ext",
    "signature": "filename_change_ext(fname, newext)",
    "description": "Returns the indicated file name, changing the extension to a new one.",
    "category": "File Handling"
  },
  {
    "name": "filename_dir",
    "signature": "filename_dir(fname)",
    "description": "Returns the directory part of the indicated file name.",
    "category": "File Handling"
  },
  {
    "name": "filename_drive",
    "signature": "filename_drive(fname)",
    "description": "Returns the drive information of the file.",
    "category": "File Handling"
  },
  {
    "name": "filename_ext",
    "signature": "filename_ext(fname)",
    "description": "Returns the extension part of the file.",
    "category": "File Handling"
  },
  {
    "name": "filename_name",
    "signature": "filename_name(fname)",
    "description": "Returns the name part of the indicated file name.",
    "category": "File Handling"
  },
  {
    "name": "filename_path",
    "signature": "filename_path(fname)",
    "description": "Returns the path part of the indicated file path.",
    "category": "File Handling"
  },
  {
    "name": "font_add",
    "signature": "font_add(name, size, bold, italic, first, last)",
    "description": "Creates a new font resource from a standard Web Font or from a *.ttf included file, and returns its index.",
    "category": "Game Assets"
  },
  {
    "name": "font_add_sprite",
    "signature": "font_add_sprite(spr, first, prop, sep)",
    "description": "Creates a new font resource based on a sprite, and returns its index.",
    "category": "Game Assets"
  },
  {
    "name": "font_add_sprite_ext",
    "signature": "font_add_sprite_ext(spr, string_map, prop, sep)",
    "description": "Creates a new font resource based on a sprite with the sub-images ordered by a string, and returns its index.",
    "category": "Game Assets"
  },
  {
    "name": "font_delete",
    "signature": "font_delete(ind)",
    "description": "Deletes a font asset.",
    "category": "Game Assets"
  },
  {
    "name": "font_exists",
    "signature": "font_exists(ind)",
    "description": "Returns whether a given font exists or not.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_bold",
    "signature": "font_get_bold(ind)",
    "description": "Returns whether a given font is bold or not.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_first",
    "signature": "font_get_first(ind)",
    "description": "Returns the index of the first character in a given font.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_fontname",
    "signature": "font_get_fontname(ind)",
    "description": "Returns the system name of a given font.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_italic",
    "signature": "font_get_italic(ind)",
    "description": "Returns whether a given font is italic or not.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_last",
    "signature": "font_get_last(ind)",
    "description": "Returns the index of the last character in a given font.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_name",
    "signature": "font_get_name(ind)",
    "description": "Returns the resource name of a given font.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_size",
    "signature": "font_get_size(ind)",
    "description": "Returns the size of a given font.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_texture",
    "signature": "font_get_texture(font)",
    "description": "Returns the texture id for the given font.",
    "category": "Game Assets"
  },
  {
    "name": "font_get_uvs",
    "signature": "font_get_uvs(font)",
    "description": "Returns the texture coordinates of the font within the texture page as an array.",
    "category": "Game Assets"
  },
  {
    "name": "font_replace",
    "signature": "font_replace(ind, name, size, bold, italic, first, last)",
    "description": "Replaces an indexed font asset with a new one.",
    "category": "Game Assets"
  },
  {
    "name": "font_replace_sprite",
    "signature": "font_replace_sprite(ind, spr, first, prop, sep)",
    "description": "Replaces an indexed sprite font asset with a new one.",
    "category": "Game Assets"
  },
  {
    "name": "font_replace_sprite_ext",
    "signature": "font_replace_sprite_ext(font, spr, string_map, prop, sep)",
    "description": "Replaces a previously created font asset based on a sprite with the sub-images ordered by a string.",
    "category": "Game Assets"
  },
  {
    "name": "font_set_cache_size",
    "signature": "font_set_cache_size(ind, max)",
    "description": "Sets the size of the cache for a given font.",
    "category": "Game Assets"
  },
  {
    "name": "game_end",
    "signature": "game_end()",
    "description": "Closes the game.",
    "category": "Miscellaneous"
  },
  {
    "name": "game_load",
    "signature": "game_load(filename)",
    "description": "Loads a saved game from a file.",
    "category": "Miscellaneous"
  },
  {
    "name": "game_load_buffer",
    "signature": "game_load_buffer(buffer)",
    "description": "Loads a saved game state from a buffer.",
    "category": "Miscellaneous"
  },
  {
    "name": "game_restart",
    "signature": "game_restart()",
    "description": "Restarts the game.",
    "category": "Miscellaneous"
  },
  {
    "name": "game_save",
    "signature": "game_save(filename)",
    "description": "Save a game to a file.",
    "category": "Miscellaneous"
  },
  {
    "name": "game_save_buffer",
    "signature": "game_save_buffer(buffer)",
    "description": "Saves a game state to a given buffer.",
    "category": "Miscellaneous"
  },
  {
    "name": "gamepad_axis_count",
    "signature": "gamepad_axis_count(device)",
    "description": "Returns the total number of axis controls for the given device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_axis_value",
    "signature": "gamepad_axis_value(device, axisIndex)",
    "description": "Returns a value based on the current axis position.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_button_check",
    "signature": "gamepad_button_check(device, button)",
    "description": "Returns whether a given gamepad button is currently down.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_button_check_pressed",
    "signature": "gamepad_button_check_pressed(device, button)",
    "description": "Returns whether a given gamepad button has been pressed.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_button_check_released",
    "signature": "gamepad_button_check_released(device, button)",
    "description": "Returns whether a given gamepad button has been released.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_button_count",
    "signature": "gamepad_button_count(device)",
    "description": "Returns the total number of supported buttons for the device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_button_value",
    "signature": "gamepad_button_value(device, button)",
    "description": "Returns the current position of an analogue button.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_get_button_threshold",
    "signature": "gamepad_get_button_threshold(device)",
    "description": "Returns the current threshold setting of the analogue buttons.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_get_description",
    "signature": "gamepad_get_description(device)",
    "description": "Returns a descriptive string for the given gamepad.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_get_device_count",
    "signature": "gamepad_get_device_count()",
    "description": "Returns the number of game pads connected or the number of slots available for game pads.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_is_connected",
    "signature": "gamepad_is_connected(numb)",
    "description": "Returns whether a given gamepad is currently connected.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_is_supported",
    "signature": "gamepad_is_supported()",
    "description": "Returns whether game pads are supported by the target platform.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_set_axis_deadzone",
    "signature": "gamepad_set_axis_deadzone(device, deadzone)",
    "description": "Set the dead-zone (input cut-off) for the axis values returned by the device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_set_button_threshold",
    "signature": "gamepad_set_button_threshold(device, threshold)",
    "description": "Sets the threshold for the analogue buttons of the given device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_set_colour",
    "signature": "gamepad_set_colour(device, colour)",
    "description": "Set the LED colour for PS4 gamepads.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "gamepad_set_vibration",
    "signature": "gamepad_set_vibration(device, left_motor, right_motor)",
    "description": "Controls the device vibration",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "get_integer",
    "signature": "get_integer(str, def)",
    "description": "Displays a pop-up message for the user to input an integer.",
    "category": "Debugging"
  },
  {
    "name": "get_integer_async",
    "signature": "get_integer_async(string, default)",
    "description": "Request an integer input from the user.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "get_login_async",
    "signature": "get_login_async(name, password)",
    "description": "An asynchronous function that returns the username and password.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "get_open_filename",
    "signature": "get_open_filename(filter, fname)",
    "description": "Opens a dialogue to select a file with the given filter.",
    "category": "File Handling"
  },
  {
    "name": "get_open_filename_ext",
    "signature": "get_open_filename_ext(filter, fname, directory, caption)",
    "description": "Opens a dialogue to select a file with the given filter, directory and window caption.",
    "category": "File Handling"
  },
  {
    "name": "get_save_filename",
    "signature": "get_save_filename(filter, fname)",
    "description": "Opens a dialogue to input a filename with the given filter for saving.",
    "category": "File Handling"
  },
  {
    "name": "get_save_filename_ext",
    "signature": "get_save_filename_ext(filter, fname, directory, caption)",
    "description": "Opens a dialogue to input a filename with the given filter for saving.",
    "category": "File Handling"
  },
  {
    "name": "get_string",
    "signature": "get_string(str, def)",
    "description": "Displays a pop-up message for the user to input a string.",
    "category": "Debugging"
  },
  {
    "name": "get_string_async",
    "signature": "get_string_async(string, default)",
    "description": "Request a string input from the user.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "get_timer",
    "signature": "get_timer()",
    "description": "This returns the time since your game started.",
    "category": "Date and Time"
  },
  {
    "name": "gml_pragma",
    "signature": "gml_pragma(command, [optional...])",
    "description": "Set the project to compile using the given command.",
    "category": "Miscellaneous"
  },
  {
    "name": "gml_release_mode",
    "signature": "gml_release_mode(flag)",
    "description": "Set the compiler to use release mode or development mode.",
    "category": "Miscellaneous"
  },
  {
    "name": "http_get",
    "signature": "http_get(url)",
    "description": "This function retrieves information from the supplied URL.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "http_get_file",
    "signature": "http_get_file(url, local_target)",
    "description": "This function retrieves a file from the supplied URL.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "http_post_string",
    "signature": "http_post_string(url, string)",
    "description": "This function not only retrieves information from the supplied URL, but sends data as part of the retrieval request.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "http_request",
    "signature": "http_request(url, method, header_map, body)",
    "description": "This function retrieves information from the supplied URL.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "ini_close",
    "signature": "ini_close()",
    "description": "Closes the currently open .ini file.",
    "category": "File Handling"
  },
  {
    "name": "ini_key_delete",
    "signature": "ini_key_delete(section, key)",
    "description": "Deletes the indicated key from the indicated section of the currently open .ini file, should the key exist.",
    "category": "File Handling"
  },
  {
    "name": "ini_key_exists",
    "signature": "ini_key_exists(section, key)",
    "description": "Returns whether or not a key in an open .ini file exists.",
    "category": "File Handling"
  },
  {
    "name": "ini_open",
    "signature": "ini_open(name)",
    "description": "Opens the relevant .ini file for reading and writing.",
    "category": "File Handling"
  },
  {
    "name": "ini_open_from_string",
    "signature": "ini_open_from_string(string)",
    "description": "Creates a temporary ini file from a string.",
    "category": "File Handling"
  },
  {
    "name": "ini_read_real",
    "signature": "ini_read_real(section, key, default)",
    "description": "Reads a saved real value (number) from an .ini file.",
    "category": "File Handling"
  },
  {
    "name": "ini_read_string",
    "signature": "ini_read_string(section, key, default)",
    "description": "Reads a saved string from an .ini file.",
    "category": "File Handling"
  },
  {
    "name": "ini_section_delete",
    "signature": "ini_section_delete(section)",
    "description": "Deletes the indicated section of the currently open .ini file, should the section exist.",
    "category": "File Handling"
  },
  {
    "name": "ini_section_exists",
    "signature": "ini_section_exists(section)",
    "description": "Returns whether or not a section in an open .ini file exists.",
    "category": "File Handling"
  },
  {
    "name": "ini_write_string",
    "signature": "ini_write_string(section, key, value)",
    "description": "Writes a string to an .ini file",
    "category": "File Handling"
  },
  {
    "name": "instance_change",
    "signature": "instance_change(obj, perf)",
    "description": "Changes the calling instance to an instance of a different object.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_copy",
    "signature": "instance_copy(perf)",
    "description": "Creates a copy of the calling instance.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_create",
    "signature": "instance_create(x, y, obj)",
    "description": "Creates an instance of a given object at a given position.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_destroy",
    "signature": "instance_destroy()",
    "description": "Destroys the calling instance, removing it from the room.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_exists",
    "signature": "instance_exists(obj)",
    "description": "Returns whether an instance of the given object exists in the current room.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_furthest",
    "signature": "instance_furthest(x, y, obj)",
    "description": "Returns the id of the instance of an object furthest from a given position.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_nearest",
    "signature": "instance_nearest(x, y, obj)",
    "description": "Returns the id of the instance of an object nearest to a given position.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_number",
    "signature": "instance_number(obj)",
    "description": "Returns the number of active instances of a given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_place",
    "signature": "instance_place(x, y, obj)",
    "description": "Checks for a collision with the specified object and returns its id.",
    "category": "Objects and Instances"
  },
  {
    "name": "instance_position",
    "signature": "instance_position( x, y, obj )",
    "description": "Checks for a collision with the specified object at a specific location and returns its id.",
    "category": "Objects and Instances"
  },
  {
    "name": "io_clear",
    "signature": "io_clear()",
    "description": "Clears all keyboard and mouse states.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_axes",
    "signature": "joystick_axes(id)",
    "description": "Returns the number of axes the joystick has.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_buttons",
    "signature": "joystick_buttons(id)",
    "description": "Returns the number of buttons the joystick has.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_check_button",
    "signature": "joystick_check_button(id, numb)",
    "description": "Checks to see if a joystick button has been pressed.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_direction",
    "signature": "joystick_direction(id)",
    "description": "Returns the direction of movement for the joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_exists",
    "signature": "joystick_exists(id)",
    "description": "Checks for a joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_has_pov",
    "signature": "joystick_has_pov(id)",
    "description": "Checks the point of view capabilities of the joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_name",
    "signature": "joystick_name(id)",
    "description": "Returns the name of the joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_pov",
    "signature": "joystick_pov(id)",
    "description": "Returns the joysticks point-of view position.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_rpos",
    "signature": "joystick_rpos(id)",
    "description": "Returns the position of the r-axis of joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_upos",
    "signature": "joystick_upos(id)",
    "description": "Returns the position of the u-axis of joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_vpos",
    "signature": "joystick_vpos(id)",
    "description": "Returns the position of the y-axis of joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_xpos",
    "signature": "joystick_xpos(id)",
    "description": "Returns the position of the x-axis of joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_ypos",
    "signature": "joystick_ypos(id)",
    "description": "Returns the position of the y-axis of joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "joystick_zpos",
    "signature": "joystick_zpos(id)",
    "description": "Returns the position of the z-axis of joystick.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "json_decode",
    "signature": "json_decode(string)",
    "description": "This function takes a JSON object string and decode it as a ds_map.",
    "category": "File Handling"
  },
  {
    "name": "json_encode",
    "signature": "json_encode(map)",
    "description": "This function encode a ds_map into a JSON format string.",
    "category": "File Handling"
  },
  {
    "name": "keyboard_check",
    "signature": "keyboard_check(key)",
    "description": "Returns whether the given key on the keyboard is currently held down.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_check_direct",
    "signature": "keyboard_check_direct(key)",
    "description": "Returns whether the key with the particular keycode is pressed by checking the hardware directly.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_check_pressed",
    "signature": "keyboard_check_pressed(key)",
    "description": "Returns whether the given key on the keyboard has just been pressed.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_check_released",
    "signature": "keyboard_check_released(key)",
    "description": "Returns whether the given key on the keyboard has just been released.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_clear",
    "signature": "keyboard_clear(key)",
    "description": "Clears the state of the given key.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_get_map",
    "signature": "keyboard_get_map(key)",
    "description": "Gets the currently mapped ascii code for the selected key.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_get_numlock",
    "signature": "keyboard_get_numlock()",
    "description": "Get the status of the numberlock key on the keypad.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_key_press",
    "signature": "keyboard_key_press(key)",
    "description": "Simulates the press of a given key.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_key_release",
    "signature": "keyboard_key_release(key)",
    "description": "Simulates the release of a given key.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_set_map",
    "signature": "keyboard_set_map(key1, key2)",
    "description": "Maps one key on the keyboard to another.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "keyboard_set_numlock",
    "signature": "keyboard_set_numlock(value)",
    "description": "Set the status of the keypad numberlock.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "lerp",
    "signature": "lerp(a, b, amt)",
    "description": "Returns the linear interpolation of two input values by the given amount.",
    "category": "Maths"
  },
  {
    "name": "matrix_build",
    "signature": "matrix_build(x, y, z, xrotation, yrotation, zrotation, xscale, yscale, zscale)",
    "description": "Build a 4x4 matrix from the given input values.",
    "category": "Drawing"
  },
  {
    "name": "matrix_get",
    "signature": "matrix_get(type)",
    "description": "Get the current values of the given matrix type.",
    "category": "Drawing"
  },
  {
    "name": "matrix_multiply",
    "signature": "matrix_multiply(matrix1, matrix2)",
    "description": "Multiply two matrix arrays together.",
    "category": "Drawing"
  },
  {
    "name": "matrix_set",
    "signature": "matrix_set(type, matrix)",
    "description": "Set the given matrix type to the values stored in a (previously created) matrix array.",
    "category": "Drawing"
  },
  {
    "name": "md5_file",
    "signature": "md5_file(filename)",
    "description": "Returns an MD5 hash for the given file.",
    "category": "File Handling"
  },
  {
    "name": "md5_string_unicode",
    "signature": "md5_string_unicode(string)",
    "description": "Returns an MD5 of the unicode format input string.",
    "category": "File Handling"
  },
  {
    "name": "md5_string_utf8",
    "signature": "md5_string_utf8(string)",
    "description": "Returns an MD5 of the utf8 format input string.",
    "category": "File Handling"
  },
  {
    "name": "merge_colour",
    "signature": "merge_colour(col1, col2, amount)",
    "description": "Merges two colours by a given amount.",
    "category": "Drawing"
  },
  {
    "name": "motion_add",
    "signature": "motion_add(dir, speed)",
    "description": "Adds to the motion of the calling object the given direction and speed",
    "category": "Movement and Collisions"
  },
  {
    "name": "motion_set",
    "signature": "motion_set(dir, speed)",
    "description": "Sets the motion of the calling object to the given direction and speed.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mouse_check_button",
    "signature": "mouse_check_button(numb)",
    "description": "Returns whether a given mouse button is currently down.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "mouse_check_button_pressed",
    "signature": "mouse_check_button_pressed(numb)",
    "description": "Returns whether a given mouse button has just been pressed.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "mouse_check_button_released",
    "signature": "mouse_check_button_released(numb)",
    "description": "Returns whether a given mouse button has just been released.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "mouse_clear",
    "signature": "mouse_clear(button)",
    "description": "This will clear the state of the currently pressed mouse buttons.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "mouse_wheel_down",
    "signature": "mouse_wheel_down()",
    "description": "The last pressed mouse button.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "mouse_wheel_up",
    "signature": "mouse_wheel_up()",
    "description": "The last pressed mouse button.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "move_bounce_all",
    "signature": "move_bounce_all( adv )",
    "description": "Allows bouncing of the calling instance against all objects.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_bounce_solid",
    "signature": "move_bounce_solid(adv)",
    "description": "Allows bouncing of the calling instance against solid objects, such as walls.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_contact_all",
    "signature": "move_contact_all(dir, maxdist)",
    "description": "Moves the instance in a given direction until it comes into contact with an object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_contact_solid",
    "signature": "move_contact_solid( dir, maxdist )",
    "description": "Moves the instance in a given direction until it comes into contact with a solid object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_outside_all",
    "signature": "move_outside_all(dir, maxdist)",
    "description": "Moves the instance in a given direction until it no longer comes into contact with any other instance.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_outside_solid",
    "signature": "move_outside_solid(dir, maxdist)",
    "description": "Moves the instance in a given direction until it NO LONGER comes into contact with a solid object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_random",
    "signature": "move_random(hsnap, vsnap)",
    "description": "Moves the calling instance to a random position on a given grid.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_snap",
    "signature": "move_snap( hsnap, vsnap )",
    "description": "Snaps the player to the nearest position on a grid with cells of a given size.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_towards_point",
    "signature": "move_towards_point( x, y, sp )",
    "description": "Moves the instance towards a given point at a given speed.",
    "category": "Movement and Collisions"
  },
  {
    "name": "move_wrap",
    "signature": "move_wrap(hor, vert, margin)",
    "description": "Wraps the player around the room if relevant.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_add_cell",
    "signature": "mp_grid_add_cell(id, h, v)",
    "description": "Marks the indicated cell as being forbidden to the path-finding functions.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_add_instances",
    "signature": "mp_grid_add_instances(id, obj, prec)",
    "description": "Marks all cells that an instance of the indicated object overlaps as being forbidden.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_add_rectangle",
    "signature": "mp_grid_add_rectangle(id, x1, y1, x2, y2)",
    "description": "Marks all cells that overlap the indicated rectangle as being forbidden.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_clear_all",
    "signature": "mp_grid_clear_all(id)",
    "description": "Mark all cells in the grid to be free.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_clear_cell",
    "signature": "mp_grid_clear_cell(id, h, v)",
    "description": "Clears the indicated cell of an mp_grid.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_clear_rectangle",
    "signature": "mp_grid_clear_rectangle(id, x1, y1, x2, y2)",
    "description": "Marks all cells that overlap the indicated rectangle as being free.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_create",
    "signature": "mp_grid_create(xstart, ystart, hcells, vcells, cellwidth, cellheight):",
    "description": "This function creates an mp_grid for the motion planning functions.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_destroy",
    "signature": "mp_grid_destroy(id)",
    "description": "Destroys the indicated mp_grid and frees up its memory.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_draw",
    "signature": "mp_grid_draw(id)",
    "description": "This function draws the specified mp_grid.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_get_cell",
    "signature": "mp_grid_get_cell(id, x , y)",
    "description": "Return whether a cell in the mp_grid is occupied or not.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_path",
    "signature": "mp_grid_path(id, path, xstart, ystart, xgoal, ygoal, allowdiag)",
    "description": "This function computes a path through the given mp_grid.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_grid_to_ds_grid",
    "signature": "mp_grid_to_ds_grid(source, destination)",
    "description": "Copies the data from a motion planning grid to a pre-made DS grid.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_linear_path",
    "signature": "mp_linear_path(path, xgoal, ygoal, stepsize, checkall)",
    "description": "This function computes a straight-line path for the instance.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_linear_path_object",
    "signature": "mp_linear_path_object(path, xgoal, ygoal, stepsize, obj)",
    "description": "This function computes a straight-line path for the instance, checking for collisions with a specific object",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_linear_step",
    "signature": "mp_linear_step(xgoal, ygoal, stepsize, checkall)",
    "description": "This makes an instance try to get to a position while checking for all other instances.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_linear_step_object",
    "signature": "mp_linear_step_object(xgoal, ygoal, stepsize, obj)",
    "description": "This makes an instance try to get to a position while checking for all instances of the specified object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_potential_path",
    "signature": "mp_potential_path(path, xgoal, ygoal, stepsize, factor, checkall)",
    "description": "Calculates a path between two points, avoiding instances along the way.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_potential_path_object",
    "signature": "mp_potential_path_object(path, xgoal, ygoal, stepsize, factor, obj)",
    "description": "Calculates a path between two points, avoiding the specified object along the way.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_potential_settings",
    "signature": "mp_potential_settings(maxrot, rotstep, ahead, onspot)",
    "description": "This function sets various parameters to change how the mp_potential functions work.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_potential_step",
    "signature": "mp_potential_step(xgoal, ygoal, stepsize, checkall)",
    "description": "This function moves an instance towards a point avoiding obstacles.",
    "category": "Movement and Collisions"
  },
  {
    "name": "mp_potential_step_object",
    "signature": "mp_potential_step_object(xgoal, ygoal, stepsize, obj)",
    "description": "This function moves an instance towards a point avoiding the specified object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "network_connect",
    "signature": "network_connect(socket, url, port)",
    "description": "Connect to a GameMaker: Studio server.",
    "category": "Networking"
  },
  {
    "name": "network_connect_raw",
    "signature": "network_connect_raw(socket, url, port)",
    "description": "Connect to a server.",
    "category": "Networking"
  },
  {
    "name": "network_create_server",
    "signature": "network_create_server(type, port, max_client)",
    "description": "Create a new network server.",
    "category": "Networking"
  },
  {
    "name": "network_create_server_raw",
    "signature": "network_create_server_raw(type, port, max_client)",
    "description": "Create a new network server with no client handshake for raw data.",
    "category": "Networking"
  },
  {
    "name": "network_create_socket",
    "signature": "network_create_socket(type)",
    "description": "Create a new client socket.",
    "category": "Networking"
  },
  {
    "name": "network_create_socket_ext",
    "signature": "network_create_socket_ext(protocol, port)",
    "description": "Create a new client socket, with a specific port number.",
    "category": "Networking"
  },
  {
    "name": "network_destroy",
    "signature": "network_destroy(socket)",
    "description": "Remove a socket (client or server).",
    "category": "Networking"
  },
  {
    "name": "network_resolve",
    "signature": "network_resolve(url)",
    "description": "Resolves the IP of a given URL.",
    "category": "Networking"
  },
  {
    "name": "network_send_broadcast",
    "signature": "network_send_broadcast(socket, port, buffer, size)",
    "description": "Broadcast data to a range of IPs.",
    "category": "Networking"
  },
  {
    "name": "network_send_packet",
    "signature": "network_send_packet(socket, buffer, size)",
    "description": "Send a GameMaker: Studio formatted packet of data over the network.",
    "category": "Networking"
  },
  {
    "name": "network_send_raw",
    "signature": "network_send_raw(socket, buffer, size)",
    "description": "Send a packet of raw buffer data.",
    "category": "Networking"
  },
  {
    "name": "network_send_udp",
    "signature": "network_send_udp(socket, url, port, buffer, size)",
    "description": "Send data over the network using UDP.",
    "category": "Networking"
  },
  {
    "name": "network_send_udp_raw",
    "signature": "network_send_udp_raw(socket, url, port, buffer, size)",
    "description": "Send raw buffer data over the network using UDP.",
    "category": "Networking"
  },
  {
    "name": "network_set_config",
    "signature": "network_set_config(config_value, setting)",
    "description": "Set different configuration options for the network.",
    "category": "Networking"
  },
  {
    "name": "network_set_timeout",
    "signature": "network_set_timeout(socket, read_timeout, write_timeout)",
    "description": "Set the timeout for reading and writing data through a socket.",
    "category": "Networking"
  },
  {
    "name": "object_set_depth",
    "signature": "object_set_depth(index, depth)",
    "description": "Sets the depth of the given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "object_set_mask",
    "signature": "object_set_mask(index, spr)",
    "description": "Sets the mask index of the given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "object_set_persistent",
    "signature": "object_set_persistent(index, pers)",
    "description": "Sets the persistence of the given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "object_set_solid",
    "signature": "object_set_solid( index, solid )",
    "description": "Sets the solidity of the given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "object_set_sprite",
    "signature": "object_set_sprite( index, spr )",
    "description": "Sets the sprite of the given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "object_set_visible",
    "signature": "object_set_visible( index, vis )",
    "description": "Sets the visibility of the given object.",
    "category": "Objects and Instances"
  },
  {
    "name": "ord",
    "signature": "ord(str)",
    "description": "Returns the Unicode value code of the first character in the given string.",
    "category": "Strings"
  },
  {
    "name": "os_get_config",
    "signature": "os_get_config()",
    "description": "Returns the name of the current configuration.",
    "category": "Operating System"
  },
  {
    "name": "os_get_info",
    "signature": "os_get_info()",
    "description": "Returns a ds_map with information about the OS.",
    "category": "Operating System"
  },
  {
    "name": "os_get_language",
    "signature": "os_get_language()",
    "description": "This function returns a different value depending on the browser or device language.",
    "category": "Operating System"
  },
  {
    "name": "os_get_region",
    "signature": "os_get_region()",
    "description": "This function returns a different value depending on the browser or device language region.",
    "category": "Operating System"
  },
  {
    "name": "os_is_network_connected",
    "signature": "os_is_network_connected()",
    "description": "Checks to see if the device has an internet connection or not.",
    "category": "Operating System"
  },
  {
    "name": "os_is_paused",
    "signature": "os_is_paused()",
    "description": "Checks to see if the device OS is paused or not.",
    "category": "Operating System"
  },
  {
    "name": "parameter_count",
    "signature": "parameter_count()",
    "description": "Returns the number of command-line parameters.",
    "category": "Miscellaneous"
  },
  {
    "name": "parameter_string",
    "signature": "parameter_string(n)",
    "description": "Returns the specified command-line parameter.",
    "category": "Miscellaneous"
  },
  {
    "name": "part_emitter_burst",
    "signature": "part_emitter_burst(ps, ind, parttype, number)",
    "description": "Bursts particles on one step only from the given emitter.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_clear",
    "signature": "part_emitter_clear(ps, ind)",
    "description": "Clears the settings of a given emitter.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_create",
    "signature": "part_emitter_create(ps)",
    "description": "Creates a new emitter in the given particle system.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_destroy",
    "signature": "part_emitter_destroy( ps, ind )",
    "description": "Destroys a given emitter in the given particle system.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_destroy_all",
    "signature": "part_emitter_destroy_all( ps )",
    "description": "Destroys all emitters in the given particle system.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_exists",
    "signature": "part_emitter_exists(ps, ind)",
    "description": "Checks to see if a given emitter exists in the given particle system.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_region",
    "signature": "part_emitter_region(ps, ind, xmin, xmax, ymin, ymax, shape, distribution)",
    "description": "Sets the region and distribution settings for the given emitter.",
    "category": "Particles"
  },
  {
    "name": "part_emitter_stream",
    "signature": "part_emitter_stream(ps, ind, parttype, number)",
    "description": "Streams particles every step from the given emitter.",
    "category": "Particles"
  },
  {
    "name": "part_particles_clear",
    "signature": "part_particles_clear(ind)",
    "description": "Clears all particles in the system.",
    "category": "Particles"
  },
  {
    "name": "part_particles_count",
    "signature": "part_particles_count(ind)",
    "description": "Returns the number of particles presently created in a given system.",
    "category": "Particles"
  },
  {
    "name": "part_particles_create",
    "signature": "part_particles_create(ind, x, y, parttype, number)",
    "description": "Create particles from a system at a given position.",
    "category": "Particles"
  },
  {
    "name": "part_particles_create_colour",
    "signature": "part_particles_create_colour(ind, x, y, parttype, colour, number)",
    "description": "Create particles from a system at a given position and with a given colour.",
    "category": "Particles"
  },
  {
    "name": "part_system_automatic_draw",
    "signature": "part_system_automatic_draw(ind, automatic)",
    "description": "Sets whether or not the particles in the particle system should be automatically drawn or not.",
    "category": "Particles"
  },
  {
    "name": "part_system_automatic_update",
    "signature": "part_system_automatic_update(ind, automatic)",
    "description": "Sets whether or not the particles in the particle system should be automatically updated or not.",
    "category": "Particles"
  },
  {
    "name": "part_system_clear",
    "signature": "part_system_clear(ind)",
    "description": "Clears a particle system to its default settings.",
    "category": "Particles"
  },
  {
    "name": "part_system_create",
    "signature": "part_system_create()",
    "description": "Creates a new particle system and returns its index.",
    "category": "Particles"
  },
  {
    "name": "part_system_depth",
    "signature": "part_system_depth( ind, depth )",
    "description": "Sets the depth of the particle system.",
    "category": "Particles"
  },
  {
    "name": "part_system_destroy",
    "signature": "part_system_destroy(ind)",
    "description": "Destroys an existing given particle system and any emitters it carries.",
    "category": "Particles"
  },
  {
    "name": "part_system_draw_order",
    "signature": "part_system_draw_order(ind, oldtonew)",
    "description": "Sets the order in which new particles are drawn.",
    "category": "Particles"
  },
  {
    "name": "part_system_drawit",
    "signature": "part_system_drawit(ind)",
    "description": "Draws the particles in a given system.",
    "category": "Particles"
  },
  {
    "name": "part_system_exists",
    "signature": "part_system_exists(ind)",
    "description": "Checks to see whether a particle system exists.",
    "category": "Particles"
  },
  {
    "name": "part_system_position",
    "signature": "part_system_position(ind, x, y)",
    "description": "Sets the position of the particle system.",
    "category": "Particles"
  },
  {
    "name": "part_system_update",
    "signature": "part_system_update(ind)",
    "description": "Updates the positions of the particles in a given system.",
    "category": "Particles"
  },
  {
    "name": "part_type_alpha1",
    "signature": "part_type_alpha1(ind, alpha1)",
    "description": "Sets a particle type to have a single alpha value throughout its lifespan.",
    "category": "Particles"
  },
  {
    "name": "part_type_alpha2",
    "signature": "part_type_alpha2(ind, alpha1, alpha2)",
    "description": "Sets a particle type to start at one alpha value and fade to another throughout its lifespan.",
    "category": "Particles"
  },
  {
    "name": "part_type_alpha3",
    "signature": "part_type_alpha3(ind, alpha1, alpha2, alpha3)",
    "description": "Sets a particle type to fade between three alpha values throughout its lifespan.",
    "category": "Particles"
  },
  {
    "name": "part_type_blend",
    "signature": "part_type_blend(ind, additive)",
    "description": "Sets a particle types blend mode.",
    "category": "Particles"
  },
  {
    "name": "part_type_clear",
    "signature": "part_type_clear(ind)",
    "description": "Clears all of the settings of a given particle type, returning it to its defaults.",
    "category": "Particles"
  },
  {
    "name": "part_type_colour_hsv",
    "signature": "part_type_colour_hsv(ind, hmin, hmax, smin, smax, vmin, vmax)",
    "description": "Set the particle colour from a hue, saturation and value range.",
    "category": "Particles"
  },
  {
    "name": "part_type_colour_mix",
    "signature": "part_type_colour_mix(ind, colour1, colour2)",
    "description": "Sets a particle type to be any blend of two given colours.",
    "category": "Particles"
  },
  {
    "name": "part_type_colour_rgb",
    "signature": "part_type_colour_rgb(ind, rmin, rmax, gmin, gmax, bmin, bmax p>",
    "description": "Set the particle colour from a red, green and blue range.",
    "category": "Particles"
  },
  {
    "name": "part_type_colour1",
    "signature": "part_type_colour1(ind, colour1)",
    "description": "Sets a particle type to be a single colour throughout its lifespan.",
    "category": "Particles"
  },
  {
    "name": "part_type_colour2",
    "signature": "part_type_colour2(ind, colour1, colour2)",
    "description": "Sets the particle type to blend between two colours",
    "category": "Particles"
  },
  {
    "name": "part_type_colour3",
    "signature": "part_type_colour3( ind, colour1, colour2, colour3 )",
    "description": "Sets a particle type to fade between three colours throughout its lifespan.",
    "category": "Particles"
  },
  {
    "name": "part_type_create",
    "signature": "part_type_create()",
    "description": "Creates a new particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_death",
    "signature": "part_type_death(ind, death_number, death_type)",
    "description": "Sets a particle type to emit another particle type at the end of its lifetime.",
    "category": "Particles"
  },
  {
    "name": "part_type_destroy",
    "signature": "part_type_destroy(ind)",
    "description": "Destroys a given particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_direction",
    "signature": "part_type_direction(ind, dir_min, dir_max, dir_incr, dir_wiggle)",
    "description": "Sets the direction properties for the given particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_exists",
    "signature": "part_type_exists(ind)",
    "description": "Checks to see if a given particle type exists.",
    "category": "Particles"
  },
  {
    "name": "part_type_gravity",
    "signature": "part_type_gravity(ind, grav_amount, grav_direction)",
    "description": "Sets the gravity of the given particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_life",
    "signature": "part_type_life(ind, life_min, life_max)",
    "description": "Sets a particle type's lifespan in steps.",
    "category": "Particles"
  },
  {
    "name": "part_type_orientation",
    "signature": "part_type_orientation( ind, ang_min, ang_max, ang_incr, ang_wiggle, ang_relative )",
    "description": "Sets the angle of the particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_scale",
    "signature": "part_type_scale(ind, xscale, yscale)",
    "description": "Sets the horizontal and vertical scaling of the particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_shape",
    "signature": "part_type_shape(ind, shape)",
    "description": "",
    "category": "Particles"
  },
  {
    "name": "part_type_size",
    "signature": "part_type_size(ind, size_min, size_max, size_incr, size_wiggle)",
    "description": "Sets the minimum and maximum start size of the particle type.",
    "category": "Particles"
  },
  {
    "name": "part_type_speed",
    "signature": "part_type_speed(ind, speed_min, speed_max, speed_incr, speed_wiggle)",
    "description": "Sets the minimum and maximum speed for any given particle.",
    "category": "Particles"
  },
  {
    "name": "part_type_sprite",
    "signature": "part_type_sprite(ind, sprite, animate, stretch, random)",
    "description": "Sets the shape of created particles to a sprite.",
    "category": "Particles"
  },
  {
    "name": "part_type_step",
    "signature": "part_type_step(ind, step_number, step_type)",
    "description": "Sets a particle to create another each step throughout its lifetime.",
    "category": "Particles"
  },
  {
    "name": "path_exists",
    "signature": "path_exists(index)",
    "description": "Returns whether a path with the given index exists or not.",
    "category": "Paths"
  },
  {
    "name": "path_get_closed",
    "signature": "path_get_closed(index)",
    "description": "Returns the closed status of a given path.",
    "category": "Paths"
  },
  {
    "name": "path_get_kind",
    "signature": "path_get_kind(index)",
    "description": "Returns whether a path is smooth or straight.",
    "category": "Paths"
  },
  {
    "name": "path_get_length",
    "signature": "path_get_length(index)",
    "description": "Returns the length, in pixels, of a given path.",
    "category": "Paths"
  },
  {
    "name": "path_get_name",
    "signature": "path_get_name(index)",
    "description": "Returns the name of a given path.",
    "category": "Paths"
  },
  {
    "name": "path_get_number",
    "signature": "path_get_number(index)",
    "description": "Returns the number of points on a path",
    "category": "Paths"
  },
  {
    "name": "path_get_point_speed",
    "signature": "path_get_point_speed(index, n)",
    "description": "Returns the speed setting of a given path's given defining point.",
    "category": "Paths"
  },
  {
    "name": "path_get_point_x",
    "signature": "path_get_point_x(index, n)",
    "description": "Returns the x coordinate of a given path's given defining point.",
    "category": "Paths"
  },
  {
    "name": "path_get_point_y",
    "signature": "path_get_point_y(index, n)",
    "description": "Returns the y coordinate of a given path's given defining point.",
    "category": "Paths"
  },
  {
    "name": "path_get_precision",
    "signature": "path_get_precision(index)",
    "description": "Returns how precise the given path is.",
    "category": "Paths"
  },
  {
    "name": "path_get_speed",
    "signature": "path_get_speed(ind, pos)",
    "description": "Returns the speed factor of a given path's given position.",
    "category": "Paths"
  },
  {
    "name": "path_get_x",
    "signature": "path_get_x(ind, pos)",
    "description": "Returns the x coordinate of a given path's given position.",
    "category": "Paths"
  },
  {
    "name": "path_get_y",
    "signature": "path_get_y(ind, pos)",
    "description": "Returns the y coordinate of a given path's given position.",
    "category": "Paths"
  },
  {
    "name": "path_start",
    "signature": "path_start(path, speed, endaction, absolute)",
    "description": "Starts a path for the current instance.",
    "category": "Paths"
  },
  {
    "name": "physics_apply_angular_impulse",
    "signature": "physics_apply_angular_impulse(impulse)",
    "description": "This function applies an angular impulse to a physics enabled instance.",
    "category": "Physics"
  },
  {
    "name": "physics_apply_force",
    "signature": "physics_apply_force(xpos, ypos, xforce, yforce)",
    "description": "This function applies a force to the current instance at a position in the room with a strength defined by a vector.",
    "category": "Physics"
  },
  {
    "name": "physics_apply_impulse",
    "signature": "physics_apply_impulse(xpos, ypos, ximpulse, yimpulse)",
    "description": "This function applies an impulse to a position in the room with a strength defined by a vector.",
    "category": "Physics"
  },
  {
    "name": "physics_apply_local_force",
    "signature": "physics_apply_local_force(xlocal, ylocal, xforce, yforce)",
    "description": "This function applies a force to an instance at a position relative to its origin and with a strength and direction defined by a vector.",
    "category": "Physics"
  },
  {
    "name": "physics_apply_local_impulse",
    "signature": "physics_apply_local_impulse(xpos, ypos, ximpulse, yimpulse)",
    "description": "This function applies an impulse to a position in the room with a strength defined by a vector.",
    "category": "Physics"
  },
  {
    "name": "physics_apply_torque",
    "signature": "physics_apply_torque(torque)",
    "description": "This function applies torque (spin) to an instance.",
    "category": "Physics"
  },
  {
    "name": "physics_draw_debug",
    "signature": "physics_draw_debug()",
    "description": "This function draws a basic schematic of the physics properties for the instance.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_add_point",
    "signature": "physics_fixture_add_point(fixture, xpos, ypos)",
    "description": "This function adds a point to create polygon shape or a chain shape for a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_bind",
    "signature": "physics_fixture_bind(fixture, target)",
    "description": "This function binds a fixture to an instance.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_bind_ext",
    "signature": "physics_fixture_bind_ext(fixture, target, xoffset, yoffset)",
    "description": "This function binds a fixture to an instance, offsetting its x or y position by a given amount.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_create",
    "signature": "physics_fixture_create()",
    "description": "This function creates a fixture and returns the id of that fixture to be used in all further calls.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_delete",
    "signature": "physics_fixture_delete(fixture)",
    "description": "This function deletes a fixture from memory.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_angular_damping",
    "signature": "physics_fixture_set_angular_damping(fixture, damping)",
    "description": "This function sets the angular damping value of a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_awake",
    "signature": "physics_fixture_set_awake(fixture, state)",
    "description": "This function tells GameMaker: Studio that the fixture is to be treated as awake or not.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_box_shape",
    "signature": "physics_fixture_set_box_shape(fixture, halfWidth, halfHeight)",
    "description": "This function sets the shape of the fixture to that of a box (rectangle) with the specified dimensions.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_chain_shape",
    "signature": "physics_fixture_set_chain_shape(fixture, loop)",
    "description": "This function sets the shape of the fixture to that of a chain.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_circle_shape",
    "signature": "physics_fixture_set_circle_shape(fixture, rad)",
    "description": "This function sets the shape of the fixture to that of a circle with the specified radius.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_collision_group",
    "signature": "physics_fixture_set_collision_group(fixture, group)",
    "description": "This function permits fixtures to be grouped to avoid or force collisions.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_density",
    "signature": "physics_fixture_set_density(fixture, density)",
    "description": "This function sets the density of a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_edge_shape",
    "signature": "physics_fixture_set_edge_shape(fixture, local_x1, local_y1, local_x2, local_y2)",
    "description": "This function sets the shape of the fixture to that of a circle with the specified radius.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_friction",
    "signature": "physics_fixture_set_friction(fixture, friction)",
    "description": "This function sets the friction of a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_linear_damping",
    "signature": "physics_fixture_set_linear_damping(fixture, damping)",
    "description": "This function sets the linear damping value of a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_polygon_shape",
    "signature": "physics_fixture_set_polygon_shape(fixture)",
    "description": "This function sets the shape of the fixture to that of a polygon.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_restitution",
    "signature": "physics_fixture_set_restitution(fixture, restitution)",
    "description": "This function sets the restitution value of a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_fixture_set_sensor",
    "signature": "physics_fixture_set_sensor(fixture, state)",
    "description": "This function tells GameMaker: Studio that the fixture is to be treated as a sensor only.",
    "category": "Physics"
  },
  {
    "name": "physics_get_density",
    "signature": "physics_get_density(fixture)",
    "description": "This function gets the density value for a bound fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_get_friction",
    "signature": "physics_get_friction(fixture)",
    "description": "This function gets the friction value for a bound fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_get_restitution",
    "signature": "physics_get_restitution(fixture)",
    "description": "This function gets the density value for a bound fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_delete",
    "signature": "physics_joint_delete(joint)",
    "description": "Delete a joint from the physics world.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_distance_create",
    "signature": "physics_joint_distance_create(inst1, inst2, w_anchor1_x, w_anchor1_y, w_anchor2_x, w_anchor2_y, col)",
    "description": "Create a straight line joint connecting two instances, both of which have had fixtures defined and assigned to them.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_enable_motor",
    "signature": "physics_joint_enable_motor(joint, motor)",
    "description": "Enables (or disables) the motor of a joint that permit this behaviour.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_friction_create",
    "signature": "physics_joint_friction_create(inst1, inst2, anchor_x, anchor_y, max_force, max_torque, col)",
    "description": "A joint for reducing the relative motion between two fixtures.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_gear_create",
    "signature": "physics_joint_gear_create(inst1, inst2, joint_1, joint_2, ratio)",
    "description": "Create a gear joint using two revolute joints or a revolute and a prismatic joint.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_get_value",
    "signature": "physics_joint_get_value(joint, value)",
    "description": "This function tests a joint and returns a value depending on the type of joint being tested and the constant being used.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_prismatic_create",
    "signature": "physics_joint_prismatic_create(inst1, inst2, w_anchor_x, w_anchor_y, w_axis_x, w_axis_x, lower_trans_limit, upper_trans_limit, limit, max_motor_force, motor_speed, motor, col)",
    "description": "Create a prismatic joint connecting two instances and permitting movement along one fixed axis.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_pulley_create",
    "signature": "physics_joint_pulley_create(inst1, inst2, w_anchor1_x, w_anchor1_y, w_anchor2_x, w_anchor2_y, l_anchor1_x, l_anchor1_y, l_anchor2_x, l_anchor2_y, ratio, max_len1, max_len2, col)",
    "description": "Create a pulley joint connecting two instances in such a way that the movement of one will have a direct influence over the movement of the other.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_revolute_create",
    "signature": "physics_joint_revolute_create(inst1, inst2, w_anchor_x, w_anchor_y, ang_min_limt, ang_max_limit, ang_limit, max_motor_torque, motor_speed, motor, col)",
    "description": "Create a revolute joint connecting two instances at one common point.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_rope_create",
    "signature": "physics_joint_rope_create(inst1, inst2, w_anchor1_x, w_anchor1_y, w_anchor2_x, w_anchor2_y, maxlength, col)",
    "description": "Create a straight line joint connecting two instances, both of which have had fixtures defined and assigned to them.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_set_value",
    "signature": "physics_joint_set_value(joint, field, value)",
    "description": "This function set a particular joint property to the specified value.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_weld_create",
    "signature": "physics_joint_weld_create(inst1, inst2, anchor_x, anchor_y, ref_angle, freq_hz, damping_ratio, col)",
    "description": "Create a strong but flexible straight line joint connecting two instances along a given angle.",
    "category": "Physics"
  },
  {
    "name": "physics_joint_wheel_create",
    "signature": "physics_joint_wheel_create(inst1, inst2, anchor_x, anchor_y, axis_x, axis_y, enableMotor, max_motor_torque, motor_speed, freq_hz, damping_ratio, col)",
    "description": "Create a wheel joint connecting two instances at a common point.",
    "category": "Physics"
  },
  {
    "name": "physics_mass_properties",
    "signature": "physics_mass_properties(mass, local_center_x, local_center_y, inertia)",
    "description": "With this you can apply specific mass properties to a fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_count",
    "signature": "physics_particle_count()",
    "description": "Retrieve the number of particles currently active in a physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_create",
    "signature": "physics_particle_create(flags, x, y, xv, yv, col, alpha, category)",
    "description": "Create a single soft body particle with the given parameters.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_delete_region_box",
    "signature": "physics_particle_delete_region_box(x, y, halfWidth, halfHeight)",
    "description": "Delete all particles from a rectangular area within the physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_delete_region_circle",
    "signature": "physics_particle_delete_region_circle(x, y, radius)",
    "description": "Delete all particles from a circular area within the physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_delete_region_poly",
    "signature": "physics_particle_delete_region_poly(pointList)",
    "description": "Delete all particles from a polygonal area within the physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_draw",
    "signature": "physics_particle_draw(typemask, category, sprite, subimg)",
    "description": "Draw a set of particles using a sprite with the default values.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_draw_ext",
    "signature": "physics_particle_draw_ext(typemask, category, sprite, subimg, xscale, yscale, ang, col, alpha)",
    "description": "Draw a set of particles using a sprite with the default values.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_damping",
    "signature": "physics_particle_get_damping()",
    "description": "Get the current linear damping value as defined for all particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_data",
    "signature": "physics_particle_get_data(buffer, flags)",
    "description": "Get data on individual particles in your physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_data_particle",
    "signature": "physics_particle_get_data_particle(ind, buffer, flags)",
    "description": "Get data on individual particles in your physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_gravity_scale",
    "signature": "physics_particle_get_gravity_scale()",
    "description": "Get the current gravity scale factor as defined for all particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_group_flags",
    "signature": "physics_particle_get_group_flags(group)",
    "description": "Get the group type flags for a group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_max_count",
    "signature": "physics_particle_get_max_count()",
    "description": "Get the maximum number of particles permitted in the physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_get_radius",
    "signature": "physics_particle_get_radius()",
    "description": "Get the current radius defined for all particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_add_point",
    "signature": "physics_particle_group_add_point(x, y)",
    "description": "Set the points of the polygon shape which will be used to create a group of soft body particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_begin",
    "signature": "physics_particle_group_begin(flags, groupflags, x, y, ang, xv, yv, ang_velocity, col, alpha, strength, category)",
    "description": "Begin the creation of a soft body particle group with the given parameters.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_box",
    "signature": "physics_particle_group_box(halfWidth, halfHeight)",
    "description": "Set the form of a soft body particle group that is to be created to be a rectangle.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_circle",
    "signature": "physics_particle_group_circle(radius)",
    "description": "Set the form of a soft body particle group that is to be created to be a circle.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_count",
    "signature": "physics_particle_group_count(group)",
    "description": "Retrieve the number of particles currently active in a single group.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_delete",
    "signature": "physics_particle_group_delete(ind)",
    "description": "Delete a particle group from the physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_end",
    "signature": "physics_particle_group_end()",
    "description": "Ends the definition of a particle group and creates it in the room.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_ang_vel",
    "signature": "physics_particle_group_get_ang_vel(group)",
    "description": "Get the angular velocity of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_angle",
    "signature": "physics_particle_group_get_angle(group)",
    "description": "Get the angle of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_centre_x",
    "signature": "physics_particle_group_get_centre_x(group)",
    "description": "Get the x position of the center of mass for a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_centre_y",
    "signature": "physics_particle_group_get_centre_y(group)",
    "description": "Get the y position of the center of mass for a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_data",
    "signature": "physics_particle_group_get_data(group, buffer, flags)",
    "description": "Get data on a group of particles in your physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_inertia",
    "signature": "physics_particle_group_get_inertia(group)",
    "description": "Get the inertia of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_vel_x",
    "signature": "physics_particle_group_get_vel_x(group)",
    "description": "Get the horizontal velocity of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_vel_y",
    "signature": "physics_particle_group_get_vel_y(group)",
    "description": "Get the vertical velocity of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_x",
    "signature": "physics_particle_group_get_x(group)",
    "description": "Get the x position of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_get_y",
    "signature": "physics_particle_group_get_y(group)",
    "description": "Get the y position of a whole group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_join",
    "signature": "physics_particle_group_join(to, from)",
    "description": "Join two particle groups together.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_group_polygon",
    "signature": "physics_particle_group_polygon()",
    "description": "Set the form of a soft body particle group that is to be created to be a polygon.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_category_flags",
    "signature": "physics_particle_set_category_flags(category, flags)",
    "description": "Set the particle type flags for a category of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_damping",
    "signature": "physics_particle_set_damping(damping)",
    "description": "Set the damping value for all particles in a physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_density",
    "signature": "physics_particle_set_density(density)",
    "description": "Set the density for all particles in a physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_flags",
    "signature": "physics_particle_set_flags(index, flags)",
    "description": "Set the particle type flags for a given particle.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_gravity_scale",
    "signature": "physics_particle_set_gravity_scale(scale)",
    "description": "Set the gravity scale factor for all particles in a physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_group_flags",
    "signature": "physics_particle_set_group_flags(group, flags)",
    "description": "Set the group type flags for a group of particles.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_max_count",
    "signature": "physics_particle_set_max_count(count)",
    "description": "Set the maximum number of particles permitted in a physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_particle_set_radius",
    "signature": "physics_particle_set_radius(radius)",
    "description": "Set the radius for all particles in a physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_pause_enable",
    "signature": "physics_pause_enable(flag)",
    "description": "Pauses or un pauses the physics simulation.",
    "category": "Physics"
  },
  {
    "name": "physics_remove_fixture",
    "signature": "physics_remove_fixture(id, fixture)",
    "description": "This function removes a fixture from an instance.",
    "category": "Physics"
  },
  {
    "name": "physics_set_density",
    "signature": "physics_set_density(fixture, density)",
    "description": "This function sets the density value for a bound fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_set_friction",
    "signature": "physics_set_friction(fixture, friction)",
    "description": "This function sets the friction value for a bound fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_set_restitution",
    "signature": "physics_set_restitution(fixture, restitution)",
    "description": "This function sets the restitution value for a bound fixture.",
    "category": "Physics"
  },
  {
    "name": "physics_test_overlap",
    "signature": "physics_test_overlap(xpos, ypos, angle, obj)",
    "description": "Checks for an overlap of two fixtures at a given position.",
    "category": "Physics"
  },
  {
    "name": "physics_world_create",
    "signature": "physics_world_create(pixeltometrescale)",
    "description": "Creates the physics system in the room specified.",
    "category": "Physics"
  },
  {
    "name": "physics_world_draw_debug",
    "signature": "physics_world_draw_debug(flag)",
    "description": "This function draws some, or all, of the physics world system for debugging depending on the flag value.",
    "category": "Physics"
  },
  {
    "name": "physics_world_gravity",
    "signature": "physics_world_gravity(xg, yg)",
    "description": "Sets the direction and strength of the gravity in the physics world.",
    "category": "Physics"
  },
  {
    "name": "physics_world_update_iterations",
    "signature": "physics_world_update_iterations(iterations)",
    "description": "This function controls the number of iterations per step of the physics world.",
    "category": "Physics"
  },
  {
    "name": "physics_world_update_speed",
    "signature": "physics_world_update_speed(speed)",
    "description": "Sets the speed at which the physics system will update.",
    "category": "Physics"
  },
  {
    "name": "place_empty",
    "signature": "place_empty(x, y)",
    "description": "Checks for a collision with any other instance.",
    "category": "Movement and Collisions"
  },
  {
    "name": "place_free",
    "signature": "place_free(x, y)",
    "description": "Checks for a collision with any instance flagged as solid.",
    "category": "Movement and Collisions"
  },
  {
    "name": "place_meeting",
    "signature": "place_meeting(x, y, obj)",
    "description": "Checks for a collision between two instances at a given position",
    "category": "Movement and Collisions"
  },
  {
    "name": "place_snapped",
    "signature": "place_snapped(hsnap, vsnap)",
    "description": "Returns whether the calling instance is aligned with the snapping values.",
    "category": "Movement and Collisions"
  },
  {
    "name": "point_direction",
    "signature": "point_direction(x1, y1, x2, y2)",
    "description": "Returns the direction, in degrees, of a vector comprised.",
    "category": "Maths"
  },
  {
    "name": "point_in_circle",
    "signature": "point_in_circle(px, py, x1, y1, r)",
    "description": "Checks to see whether a given point falls within the defined circular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "point_in_rectangle",
    "signature": "point_in_rectangle(px, py, x1, y1, x2, y2)",
    "description": "Checks to see whether a given point falls within the defined rectangular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "point_in_triangle",
    "signature": "point_in_triangle(px, py, x1, y1, x2, y2, x3, y3)",
    "description": "Checks to see whether a given point falls within the defined triangular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "position_change",
    "signature": "position_change(x, y, obj, perf)",
    "description": "Changes all instances at a given position to a different object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "position_destroy",
    "signature": "position_destroy(x, y)",
    "description": "Destroys all instances that collide with a given position.",
    "category": "Movement and Collisions"
  },
  {
    "name": "position_empty",
    "signature": "position_empty(x, y)",
    "description": "Returns whether a given position is empty or not.",
    "category": "Movement and Collisions"
  },
  {
    "name": "position_meeting",
    "signature": "position_meeting(x, y, obj)",
    "description": "Checks a position for a collision with a specific object.",
    "category": "Movement and Collisions"
  },
  {
    "name": "real",
    "signature": "real( str )",
    "description": "Takes a string and returns it into a real number.",
    "category": "Strings"
  },
  {
    "name": "rectangle_in_circle",
    "signature": "rectangle_in_circle(sx1, sy1, sx2, sy2, x, y, rad)",
    "description": "Checks to see if a rectangular area collides, or is encompassed by, a defined circular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "rectangle_in_rectangle",
    "signature": "rectangle_in_rectangle(sx1, sy1, sx2, sy2, dx1, dy1, dx2, dy2)",
    "description": "Checks to see if a rectangular area collides, or is encompassed by, another rectangular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "rectangle_in_triangle",
    "signature": "rectangle_in_triangle(sx1, sy1, sx2, sy2, dx1, dy1, dx2, dy2, dx3, dy3)",
    "description": "Checks to see if a rectangular area collides, or is encompassed by, a defined triangular area.",
    "category": "Movement and Collisions"
  },
  {
    "name": "room_add",
    "signature": "room_add()",
    "description": "Creates a new room.",
    "category": "Rooms"
  },
  {
    "name": "room_assign",
    "signature": "room_assign(ind, room)",
    "description": "Copy one room to another.",
    "category": "Rooms"
  },
  {
    "name": "room_duplicate",
    "signature": "room_duplicate(ind)",
    "description": "This will duplicate a room.",
    "category": "Rooms"
  },
  {
    "name": "room_exists",
    "signature": "room_exists(index)",
    "description": "Returns whether a room with the given index exists or not.",
    "category": "Rooms"
  },
  {
    "name": "room_get_name",
    "signature": "room_get_name(index)",
    "description": "Returns the name of the room with the given index.",
    "category": "Rooms"
  },
  {
    "name": "room_goto",
    "signature": "room_goto(numb)",
    "description": "This is used to go to a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_goto_next",
    "signature": "room_goto_next()",
    "description": "This is used to jump to the next room.",
    "category": "Rooms"
  },
  {
    "name": "room_goto_previous",
    "signature": "room_goto_previous()",
    "description": "This is used to jump to the previous room.",
    "category": "Rooms"
  },
  {
    "name": "room_instance_add",
    "signature": "room_instance_add(ind, x, y, obj)",
    "description": "Adds an object instance at a given position to a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_instance_clear",
    "signature": "room_instance_clear(ind)",
    "description": "Clears all instances in a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_next",
    "signature": "room_next(numb)",
    "description": "This will return the index of the room after the given room id.",
    "category": "Rooms"
  },
  {
    "name": "room_previous",
    "signature": "room_previous(numb)",
    "description": "This will return the index of the room before the given room id.",
    "category": "Rooms"
  },
  {
    "name": "room_restart",
    "signature": "room_restart()",
    "description": "This is used to restart the current room.",
    "category": "Rooms"
  },
  {
    "name": "room_set_background",
    "signature": "room_set_background(ind, bind, vis, fore, back, x, y, htiled, vtiled, hspeed, vspeed, alpha)",
    "description": "Sets a background and its related attributes of a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_set_background_colour",
    "signature": "room_set_background_colour(ind, col, show)",
    "description": "Sets the background colour of a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_set_height",
    "signature": "room_set_height( ind, h )",
    "description": "Sets the height, in pixels, of a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_set_persistent",
    "signature": "room_set_persistent( ind, val )",
    "description": "Sets whether a given room is persistent or not.",
    "category": "Rooms"
  },
  {
    "name": "room_set_view_enabled",
    "signature": "room_set_view_enabled( ind, val )",
    "description": "Sets whether views are enabled or not in a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_set_width",
    "signature": "room_set_width( ind, w )",
    "description": "Sets the width, in pixels, of a given room.",
    "category": "Rooms"
  },
  {
    "name": "room_tile_add",
    "signature": "room_tile_add(ind, back, left, top, width, height, x, y, depth)",
    "description": "Add a new tile to a room and return its index.",
    "category": "Rooms"
  },
  {
    "name": "room_tile_add_ext",
    "signature": "room_tile_add_ext(ind, back, left, top, width, height, x, y, depth, xscale, yscale, alpha)",
    "description": "Adds a new tile to a given room and sets its properties.",
    "category": "Rooms"
  },
  {
    "name": "room_tile_clear",
    "signature": "room_tile_clear(ind)",
    "description": "Clears all tiles from a given room.",
    "category": "Rooms"
  },
  {
    "name": "screen_save",
    "signature": "screen_save(fname)",
    "description": "Saves a screenshot of the game as a *.png .",
    "category": "Windows And Views"
  },
  {
    "name": "screen_save_part",
    "signature": "screen_save_part(fname,x,y,w,h)",
    "description": "Saves a screenshot of a defined area of the game window as a .png to a given filename.",
    "category": "Windows And Views"
  },
  {
    "name": "script_execute",
    "signature": "script_execute(scr, arg0, arg1, arg2, ...)",
    "description": "Execute the script with index scr with the given arguments",
    "category": "Miscellaneous"
  },
  {
    "name": "script_exists",
    "signature": "script_exists(scr)",
    "description": "Returns whether a script with the given index exists.",
    "category": "Miscellaneous"
  },
  {
    "name": "script_get_name",
    "signature": "script_get_name(scr)",
    "description": "Returns the name of the script with the given index.",
    "category": "Miscellaneous"
  },
  {
    "name": "sha1_file",
    "signature": "sha1_file(filename)",
    "description": "Returns a sha1 hash for the given file.",
    "category": "File Handling"
  },
  {
    "name": "sha1_string_unicode",
    "signature": "sha1_string_unicode(string)",
    "description": "Returns a sha1 hash of the unicode format input string.",
    "category": "File Handling"
  },
  {
    "name": "sha1_string_utf8",
    "signature": "sha1_string_utf8(string)",
    "description": "Returns a sha1 hash of the utf8 format input string.",
    "category": "File Handling"
  },
  {
    "name": "shader_current",
    "signature": "shader_current()",
    "description": "Returns the ID of the shader currently being used for rendering.",
    "category": "Shaders"
  },
  {
    "name": "shader_enable_corner_id",
    "signature": "shader_enable_corner_id(enable)",
    "description": "Permit all shaders to use colour bytes to determine the corner id of the vertex.",
    "category": "Shaders"
  },
  {
    "name": "shader_get_sampler_index",
    "signature": "shader_get_sampler_index(shader, uniform)",
    "description": "Get the handle of a given shader sampler.",
    "category": "Shaders"
  },
  {
    "name": "shader_get_uniform",
    "signature": "shader_get_uniform(shader, uniform)",
    "description": "Get the handle of a given shader constant.",
    "category": "Shaders"
  },
  {
    "name": "shader_is_compiled",
    "signature": "shader_is_compiled(shader)",
    "description": "Checks a shader to make sure that it has compiled okay.",
    "category": "Shaders"
  },
  {
    "name": "shader_reset",
    "signature": "shader_reset()",
    "description": "Reset the draw target from a shader to standard drawing.",
    "category": "Shaders"
  },
  {
    "name": "shader_set",
    "signature": "shader_set(shader)",
    "description": "Set a shader to be used for all further drawing.",
    "category": "Shaders"
  },
  {
    "name": "shader_set_uniform_f",
    "signature": "shader_set_uniform_f(handle, value1 [, value2, value3, value4])",
    "description": "Set a shader constant to a new floating point value (or values).",
    "category": "Shaders"
  },
  {
    "name": "shader_set_uniform_f_array",
    "signature": "shader_set_uniform_f_array(handle, array)",
    "description": "Set a shader constant to an array of floating point values.",
    "category": "Shaders"
  },
  {
    "name": "shader_set_uniform_i",
    "signature": "shader_set_uniform_i(handle, value1 [, value2, value3, value4])",
    "description": "Set a shader constant to a new integer value (or values).",
    "category": "Shaders"
  },
  {
    "name": "shader_set_uniform_i_array",
    "signature": "shader_set_uniform_i_array(handle, array)",
    "description": "Set a shader constant to an array of integer values.",
    "category": "Shaders"
  },
  {
    "name": "shader_set_uniform_matrix",
    "signature": "shader_set_uniform_matrix(handle)",
    "description": "Set a shader constant to the current transform matrix.",
    "category": "Shaders"
  },
  {
    "name": "shader_set_uniform_matrix_array",
    "signature": "shader_set_uniform_matrix_array(handle, array)",
    "description": "Set a shader constant to matrix array.",
    "category": "Shaders"
  },
  {
    "name": "shaders_are_supported",
    "signature": "shaders_are_supported()",
    "description": "Checks to see if the target platform supports shaders.",
    "category": "Shaders"
  },
  {
    "name": "show_debug_message",
    "signature": "show_debug_message(string)",
    "description": "Show a debug message in the compiler window.",
    "category": "Debugging"
  },
  {
    "name": "show_debug_overlay",
    "signature": "show_debug_overlay(enable)",
    "description": "Show the debug overlay.",
    "category": "Debugging"
  },
  {
    "name": "show_error",
    "signature": "show_error(str, abort)",
    "description": "Displays a pop-up message with a custom error string.",
    "category": "Debugging"
  },
  {
    "name": "show_message",
    "signature": "show_message(str)",
    "description": "Displays a pop-up message.",
    "category": "Debugging"
  },
  {
    "name": "show_message_async",
    "signature": "show_message_async(string)",
    "description": "Shows a message to the user.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "show_question",
    "signature": "show_question(str)",
    "description": "Displays a pop-up question.",
    "category": "Debugging"
  },
  {
    "name": "show_question_async",
    "signature": "show_question_async(string)",
    "description": "Shows a question to the user.",
    "category": "Asynchronous Functions"
  },
  {
    "name": "skeleton_animation_clear",
    "signature": "skeleton_animation_clear(track)",
    "description": "Clear the given animation track.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_get",
    "signature": "skeleton_animation_get()",
    "description": "Get the animation set being used currently.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_get_duration",
    "signature": "skeleton_animation_get_duration(animname)",
    "description": "Get the time, in seconds, that a given animation set requires to play.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_get_ext",
    "signature": "skeleton_animation_get_ext(track)",
    "description": "Get the animation set used by the given track.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_get_frame",
    "signature": "skeleton_animation_get_frame(track)",
    "description": "Returns the frame number of the animation on the specified track",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_get_frames",
    "signature": "skeleton_animation_get_frames(anim_name)",
    "description": "Returns the total number of frames for the specified animation.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_list",
    "signature": "skeleton_animation_list(sprite, list)",
    "description": "Populate a DS list with the names for all animations included in the sprite.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_mix",
    "signature": "skeleton_animation_mix(animfrom, animto, duration)",
    "description": "Set the time period used to interpolate from one animation set to another.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_set",
    "signature": "skeleton_animation_set(animname)",
    "description": "Set the currently selected skeletal animation sprite to use the given animation set.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_set_ext",
    "signature": "skeleton_animation_set_ext(animname, track)",
    "description": "Set the currently selected skeletal animation sprite to use multiple animation sets.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_animation_set_frame",
    "signature": "skeleton_animation_set_frame(track, index)",
    "description": "Sets an animation frame for the given track.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_attachment_create",
    "signature": "skeleton_attachment_create(name, sprite, ind, xorigin, yorigin, xscale, yscale, rot)",
    "description": "Set an attachment image for the given slot.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_attachment_get",
    "signature": "skeleton_attachment_get(slot)",
    "description": "Get the current attachment for the given slot.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_attachment_set",
    "signature": "skeleton_attachment_set(slot, attachment)",
    "description": "Set an attachment image for the given slot.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_bone_data_get",
    "signature": "skeleton_bone_data_get(bone, map)",
    "description": "Provides access to the bone data used for the default pose of the skeletal animation.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_bone_data_set",
    "signature": "skeleton_bone_data_set(bone, map)",
    "description": "Permits you to modify the bone data used for the default pose of the skeletal animation.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_bone_state_get",
    "signature": "skeleton_bone_state_get(bone, map)",
    "description": "Provides access to the bone data as calculated from the current set animation.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_bone_state_set",
    "signature": "skeleton_bone_state_set(bone, map)",
    "description": "Permits you to modify the bone data used for the current pose of the skeletal animation.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_collision_draw_set",
    "signature": "skeleton_collision_draw_set(flag)",
    "description": "Toggle on or off the drawing of collision data for the skeletal animation sprite.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_get_bounds",
    "signature": "skeleton_get_bounds(index)",
    "description": "Retrieve data about a specific bounding box associated with a skeleton animation sprite.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_get_minmax",
    "signature": "skeleton_get_minmax()",
    "description": "Get the total bounding box position for the sprite",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_get_num_bounds",
    "signature": "skeleton_get_num_bounds()",
    "description": "Returns the number of bounding boxes attached to the current spine skeleton.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_skin_get",
    "signature": "skeleton_skin_get()",
    "description": "Get the name of the skin that the skeletal animation sprite is being drawn with.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_skin_list",
    "signature": "skeleton_skin_list(sprite, list)",
    "description": "Populate a DS list with the names for all skins included in the sprite.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_skin_set",
    "signature": "skeleton_skin_set(skinname)",
    "description": "Set the skin that the skeletal animation sprite should be drawn with.",
    "category": "Game Assets"
  },
  {
    "name": "skeleton_slot_data",
    "signature": "skeleton_slot_data(sprite, list)",
    "description": "Populate a DS list with a series of DS maps containing information about each available attachment slot.",
    "category": "Game Assets"
  },
  {
    "name": "sound_add",
    "signature": "sound_add(fname, kind, preload)",
    "description": "Adds a new sound from a given file. DEPRECATED",
    "category": "Game Assets"
  },
  {
    "name": "sound_delete",
    "signature": "sound_delete(index)",
    "description": "Deletes the indicated sound to free it from game memory. DEPRECATED",
    "category": "Game Assets"
  },
  {
    "name": "sound_exists",
    "signature": "sound_exists(index)",
    "description": "Checks whether the given sound exists.",
    "category": "Game Assets"
  },
  {
    "name": "sound_fade",
    "signature": "sound_fade(index, value, time)",
    "description": "Fade a sound in or out over a given time.",
    "category": "Game Assets"
  },
  {
    "name": "sound_get_name",
    "signature": "sound_get_name(index)",
    "description": "Returns the resource name of the given sound.",
    "category": "Game Assets"
  },
  {
    "name": "sound_global_volume",
    "signature": "sound_global_volume(value)",
    "description": "Sets the volume of all sounds.",
    "category": "Game Assets"
  },
  {
    "name": "sound_isplaying",
    "signature": "sound_isplaying(index)",
    "description": "Checks to see if a given sound is playing.",
    "category": "Game Assets"
  },
  {
    "name": "sound_loop",
    "signature": "sound_loop(index)",
    "description": "Loops the indicated sound.",
    "category": "Game Assets"
  },
  {
    "name": "sound_play",
    "signature": "sound_play(index)",
    "description": "Plays the indicated sound once.",
    "category": "Game Assets"
  },
  {
    "name": "sound_replace",
    "signature": "sound_replace(index, fname, kind, preload)",
    "description": "Replaces an existing sound with one from a given filename DEPRECATED .",
    "category": "Game Assets"
  },
  {
    "name": "sound_stop",
    "signature": "sound_stop(index)",
    "description": "Stops a given sound.",
    "category": "Game Assets"
  },
  {
    "name": "sound_stop_all",
    "signature": "sound_stop_all()",
    "description": "Stops every currently-playing sound.",
    "category": "Game Assets"
  },
  {
    "name": "sound_volume",
    "signature": "sound_volume(index, value)",
    "description": "Sets the volume of a given sound.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_add",
    "signature": "sprite_add(fname, imgnumb, removeback, smooth, xorig, yorig)",
    "description": "Adds an image from a file to the set of sprite assets.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_add_from_surface",
    "signature": "sprite_add_from_surface(index, surface, x, y, w, h, removeback, smooth)",
    "description": "Adds an area of a surface as a next subimage to a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_assign",
    "signature": "sprite_assign(index, sprite)",
    "description": "Assigns one sprite to another sprite index.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_collision_mask",
    "signature": "sprite_collision_mask(ind, sepmasks, bboxmode, bbleft, bbtop, bbright, bbbottom, kind, tolerance)",
    "description": "Defines a collision mask for the given sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_create_from_surface",
    "signature": "sprite_create_from_surface(index, x, y, w, h, removeback, smooth, xorig, yorig)",
    "description": "Creates a sprite by copying an area from a surface.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_delete",
    "signature": "sprite_delete(index)",
    "description": "Deletes the sprite from memory, freeing the memory used.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_duplicate",
    "signature": "sprite_duplicate(index)",
    "description": "Creates a duplicate of the sprite with the given index.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_exists",
    "signature": "sprite_exists(index)",
    "description": "Determines whether a sprite exists or not.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_flush",
    "signature": "sprite_flush(ind)",
    "description": "Flush a sprite asset (and the texture page it's on) from memory.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_bbox_bottom",
    "signature": "sprite_get_bbox_bottom(ind)",
    "description": "Returns the relative position of the bottom of the bounding box of the given sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_bbox_left",
    "signature": "sprite_get_bbox_left(ind)",
    "description": "Returns the relative position of the left of the bounding box of the given sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_bbox_right",
    "signature": "sprite_get_bbox_right(ind)",
    "description": "Returns the relative position of the right of the bounding box of the given sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_bbox_top",
    "signature": "sprite_get_bbox_top(ind)",
    "description": "Returns the relative position of the top of the bounding box of the given sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_height",
    "signature": "sprite_get_height(index)",
    "description": "Finds the height of a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_name",
    "signature": "sprite_get_name(index)",
    "description": "Gets the name of a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_number",
    "signature": "sprite_get_number(index)",
    "description": "Returns the number of sub-images in a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_texture",
    "signature": "sprite_get_texture(spr, subimg)",
    "description": "Returns the texture id for the given sprite and sub-image.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_tpe",
    "signature": "sprite_get_tpe(sprite, index)",
    "description": "Returns a value for the texture page entry of the sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_uvs",
    "signature": "sprite_get_uvs(sprite, subimage)",
    "description": "Returns the texture coordinates of the sprite within the texture page as an array.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_width",
    "signature": "sprite_get_width(index)",
    "description": "Finds the width of a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_xoffset",
    "signature": "sprite_get_xoffset(index)",
    "description": "Finds the xoffset of a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_get_yoffset",
    "signature": "sprite_get_yoffset(index)",
    "description": "Finds the yoffset of a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_merge",
    "signature": "sprite_merge(ind1, ind2)",
    "description": "Merges the images from one sprite into another.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_prefetch",
    "signature": "sprite_prefetch(ind)",
    "description": "Fetch the texture page for a given sprite asset.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_prefetch_multi",
    "signature": "sprite_prefetch_multi(array)",
    "description": "Fetch multiple texture pages for a number of sprite assets.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_replace",
    "signature": "sprite_replace(ind, fname, imgnumb, removeback, smooth, xorig, yorig)",
    "description": "Replace a sprite resource with an external one.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_save",
    "signature": "sprite_save(ind, subimg, fname)",
    "description": "Save a sprite to disc.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_save_strip",
    "signature": "sprite_save_strip(ind, filename)",
    "description": "Saves a sprite to disc as a strip image.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_set_alpha_from_sprite",
    "signature": "sprite_set_alpha_from_sprite(ind, spr)",
    "description": "Changes the alpha (transparency) of one given sprite based on the intensity/value map of another.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_set_cache_size",
    "signature": "sprite_set_cache_size(ind, max)",
    "description": "Sets the size of the cache for a given sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_set_cache_size_ext",
    "signature": "sprite_set_cache_size_ext(ind, index, max)",
    "description": "Sets the size of the cache for a given sub-image of a sprite.",
    "category": "Game Assets"
  },
  {
    "name": "sprite_set_offset",
    "signature": "sprite_set_offset(ind, xoff, yoff)",
    "description": "Change the x and y offset (origin) of the given sprite asset.",
    "category": "Game Assets"
  },
  {
    "name": "string",
    "signature": "string(realNum)",
    "description": "Turns a real number into a string.",
    "category": "Strings"
  },
  {
    "name": "string_byte_at",
    "signature": "string_byte_at(str, index)",
    "description": "Returns the raw byte value as a real value at a given position in the given string.",
    "category": "Strings"
  },
  {
    "name": "string_byte_length",
    "signature": "string_byte_length( str )",
    "description": "Returns the number of bytes in a string.",
    "category": "Strings"
  },
  {
    "name": "string_char_at",
    "signature": "string_char_at(str, index)",
    "description": "Checks a given string and returns the character at a given position.",
    "category": "Strings"
  },
  {
    "name": "string_copy",
    "signature": "string_copy(str, index, count)",
    "description": "Returns all or part of another string.",
    "category": "Strings"
  },
  {
    "name": "string_count",
    "signature": "string_count(substr, str)",
    "description": "Returns the number of instances of a substring found within a given string.",
    "category": "Strings"
  },
  {
    "name": "string_delete",
    "signature": "string_delete(str, index, count)",
    "description": "Returns a copy of a given string with a selected section deleted.",
    "category": "Strings"
  },
  {
    "name": "string_digits",
    "signature": "string_digits( str )",
    "description": "Returns a copy of a given string with everything but its digits removed.",
    "category": "Strings"
  },
  {
    "name": "string_height",
    "signature": "string_height(string)",
    "description": "Returns the height in pixels of a string.",
    "category": "Strings"
  },
  {
    "name": "string_height_ext",
    "signature": "string_height_ext(string, sep, w)",
    "description": "Returns the height in pixels of a string based on the given separation and line-break width.",
    "category": "Strings"
  },
  {
    "name": "string_insert",
    "signature": "string_insert(substr, str, index)",
    "description": "Returns a copy of a given string with a substring inserted into a chosen position.",
    "category": "Strings"
  },
  {
    "name": "string_length",
    "signature": "string_length(str)",
    "description": "Returns the number of characters comprising a given string.",
    "category": "Strings"
  },
  {
    "name": "string_letters",
    "signature": "string_letters(str)",
    "description": "Returns a copy of a given string with everything but its letters removed.",
    "category": "Strings"
  },
  {
    "name": "string_lettersdigits",
    "signature": "string_lettersdigits(str)",
    "description": "Returns a copy of a given string with everything but its letters and digits removed.",
    "category": "Strings"
  },
  {
    "name": "string_lower",
    "signature": "string_lower( str )",
    "description": "Returns a copy of a given string in all lowercase letters.",
    "category": "Strings"
  },
  {
    "name": "string_ord_at",
    "signature": "string_ord_at(str, index)",
    "description": "Checks a given string and returns the character code for the character at a given position.",
    "category": "Strings"
  },
  {
    "name": "string_pos",
    "signature": "string_pos(substr, str)",
    "description": "Returns the position of a given sub-string in a string.",
    "category": "Strings"
  },
  {
    "name": "string_repeat",
    "signature": "string_repeat(str, count)",
    "description": "Returns a copy of a given string repeated a given number of times.",
    "category": "Strings"
  },
  {
    "name": "string_replace",
    "signature": "string_replace(str, substr, newstr)",
    "description": "Returns a copy of a string with the first instance of a given substring replaced with a new substring.",
    "category": "Strings"
  },
  {
    "name": "string_replace_all",
    "signature": "string_replace_all(str, substr, newstr)",
    "description": "Returns a copy of a string with all instances of a given substring replaced with a new substring.",
    "category": "Strings"
  },
  {
    "name": "string_set_byte_at",
    "signature": "string_set_byte_at(str, pos, byte)",
    "description": "Set a byte in a string.",
    "category": "Strings"
  },
  {
    "name": "string_upper",
    "signature": "string_upper( str )",
    "description": "Returns a copy of a given string in all uppercase (capital) letters.",
    "category": "Strings"
  },
  {
    "name": "string_width",
    "signature": "string_width(string)",
    "description": "Returns the width in pixels of a given string.",
    "category": "Strings"
  },
  {
    "name": "string_width_ext",
    "signature": "string_width_ext(string, sep, w)",
    "description": "Returns the maximum width in pixels of a string based on the given separation and line-break width.",
    "category": "Strings"
  },
  {
    "name": "surface_copy",
    "signature": "surface_copy(destination, x, y, source)",
    "description": "Copies a source surface into a destination surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_copy_part",
    "signature": "surface_copy_part(destination, x, y, source, xs, ys, ws, hs)",
    "description": "Copies part of a source surface onto a destination surface (without any form of blending.)",
    "category": "Surfaces"
  },
  {
    "name": "surface_create",
    "signature": "surface_create(w, h)",
    "description": "Creates a surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_create_ext",
    "signature": "surface_create_ext(name, w, h)",
    "description": "Creates a surface and links it to an HTML5 canvas element.",
    "category": "Surfaces"
  },
  {
    "name": "surface_exists",
    "signature": "surface_exists(surface_id)",
    "description": "Finds whether a given surface exists or not.",
    "category": "Surfaces"
  },
  {
    "name": "surface_free",
    "signature": "surface_free(surface_id)",
    "description": "Destroys the surface, freeing it from memory.",
    "category": "Surfaces"
  },
  {
    "name": "surface_get_height",
    "signature": "surface_get_height(surface_id)",
    "description": "Finds the pixel height of a surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_get_texture",
    "signature": "surface_get_texture(surface_id)",
    "description": "Returns the texture id for the given surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_get_width",
    "signature": "surface_get_width(surface_id)",
    "description": "Finds the pixel width of a surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_getpixel",
    "signature": "surface_getpixel(surface_id, x, y)",
    "description": "Returns the colour of the pixel corresponding a position in the surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_getpixel_ext",
    "signature": "surface_getpixel_ext(surface_id, x, y)",
    "description": "Returns the full 32bit value for the pixel at a given coordinate on a surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_reset_target",
    "signature": "surface_reset_target()",
    "description": "Sets the drawing target back to the screen, which is the default setting.",
    "category": "Surfaces"
  },
  {
    "name": "surface_resize",
    "signature": "surface_resize(surface_id, w, h)",
    "description": "Resize a previously created surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_save",
    "signature": "surface_save(surface_id, fname)",
    "description": "Saves a surface to disc.",
    "category": "Surfaces"
  },
  {
    "name": "surface_save_part",
    "signature": "surface_save_part(surface_id, fname, x, y, width, height)",
    "description": "Saves a part of a surface to disc.",
    "category": "Surfaces"
  },
  {
    "name": "surface_set_target",
    "signature": "surface_set_target(surface_id)",
    "description": "Sets the drawing target to a specific surface.",
    "category": "Surfaces"
  },
  {
    "name": "surface_set_target_ext",
    "signature": "surface_set_target_ext(index, surface_id)",
    "description": "Sets the MRT output target to a specific surface.",
    "category": "Surfaces"
  },
  {
    "name": "texture_get_height",
    "signature": "texture_get_height(tex)",
    "description": "Gets the height of a given texture asset.",
    "category": "Drawing"
  },
  {
    "name": "texture_get_texel_height",
    "signature": "texture_get_texel_height(tex)",
    "description": "Get the height of a single texel for a texture page.",
    "category": "Drawing"
  },
  {
    "name": "texture_get_texel_width",
    "signature": "texture_get_texel_width(tex)",
    "description": "Get the width of a single texel for a texture page.",
    "category": "Drawing"
  },
  {
    "name": "texture_get_width",
    "signature": "texture_get_width(tex)",
    "description": "Gets the width of a given texture asset.",
    "category": "Drawing"
  },
  {
    "name": "texture_global_scale",
    "signature": "texture_global_scale(pow2integer)",
    "description": "Used to control the scaling of the texture pages on load from the WAD file.",
    "category": "Drawing"
  },
  {
    "name": "texture_set_blending",
    "signature": "texture_set_blending(blend)",
    "description": "Indicates whether to use blending with colours and alpha values.",
    "category": "Drawing"
  },
  {
    "name": "texture_set_interpolation",
    "signature": "texture_set_interpolation(linear)",
    "description": "Indicates whether to use linear interpolation or not.",
    "category": "Drawing"
  },
  {
    "name": "texture_set_interpolation_ext",
    "signature": "texture_set_interpolation_ext(sampler_id, linear)",
    "description": "Indicates whether to use linear interpolation or not for a given shader sampler.",
    "category": "Drawing"
  },
  {
    "name": "texture_set_repeat",
    "signature": "texture_set_repeat(repeat)",
    "description": "Indicates whether to use texture repeats.",
    "category": "Drawing"
  },
  {
    "name": "texture_set_repeat_ext",
    "signature": "texture_set_repeat_ext(sampler_id, repeat)",
    "description": "Indicates whether a given shader sampler texture should repeat or not.",
    "category": "Drawing"
  },
  {
    "name": "texture_set_stage",
    "signature": "texture_set_stage(stage, tex)",
    "description": "Indicates which texture \"slot\" to add a texture to when working with shaders.",
    "category": "Drawing"
  },
  {
    "name": "tile_add",
    "signature": "tile_add(background, left, top, width, height, x, y, depth)",
    "description": "Adds a new tile to the room, allowing customisation of its attributes, and returning its index.",
    "category": "Game Assets"
  },
  {
    "name": "tile_delete",
    "signature": "tile_delete(index)",
    "description": "Deletes a given tile in the room.",
    "category": "Game Assets"
  },
  {
    "name": "tile_exists",
    "signature": "tile_exists(index)",
    "description": "Checks if a given tile exists in the room.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_alpha",
    "signature": "tile_get_alpha(index)",
    "description": "Returns the alpha value of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_background",
    "signature": "tile_get_background(index)",
    "description": "Returns the background index a given tile is drawn from.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_blend",
    "signature": "tile_get_blend(index)",
    "description": "Returns the blending colour of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_count",
    "signature": "tile_get_count()",
    "description": "Returns the total number of tiles in a room.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_depth",
    "signature": "tile_get_depth(index)",
    "description": "Returns the depth of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_height",
    "signature": "tile_get_height(index)",
    "description": "Returns the height of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_id",
    "signature": "tile_get_id(index)",
    "description": "Returns the unique id for the given tile index.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_ids",
    "signature": "tile_get_ids()",
    "description": "Returns an array containing the unique ID values for all tiles in a room.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_ids_at_depth",
    "signature": "tile_get_ids_at_depth(depth)",
    "description": "Returns an array containing the unique ID values for all tiles at a given depth.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_left",
    "signature": "tile_get_left(index)",
    "description": "Returns the left coordinate of a given tile from its background.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_top",
    "signature": "tile_get_top(index)",
    "description": "Returns the top coordinate of a given tile from its background.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_visible",
    "signature": "tile_get_visible(index)",
    "description": "Returns whether a tile is visible or not.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_width",
    "signature": "tile_get_width(index)",
    "description": "Returns the width of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_x",
    "signature": "tile_get_x(index)",
    "description": "Returns the x coordinate of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_xscale",
    "signature": "tile_get_xscale(index)",
    "description": "Returns the horizontal scaling of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_y",
    "signature": "tile_get_y(index)",
    "description": "Returns the y coordinate of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_get_yscale",
    "signature": "tile_get_yscale(index)",
    "description": "Returns the vertical scaling of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_delete",
    "signature": "tile_layer_delete(depth)",
    "description": "Deletes all tiles at the indicated depth layer.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_delete_at",
    "signature": "tile_layer_delete_at(depth, x, y)",
    "description": "Deletes the tile(s) at a given depth and position.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_depth",
    "signature": "tile_layer_depth(depth, newdepth)",
    "description": "Moves all tiles at a given depth to a new depth.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_find",
    "signature": "tile_layer_find(depth, x, y)",
    "description": "Returns the id of a tile at a given depth and position.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_hide",
    "signature": "tile_layer_hide(depth)",
    "description": "Hides all tiles at the indicated depth layer.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_shift",
    "signature": "tile_layer_shift(depth, x, y)",
    "description": "Shifts all tiles at the indicated depth layer by a given amount.",
    "category": "Game Assets"
  },
  {
    "name": "tile_layer_show",
    "signature": "tile_layer_show(depth)",
    "description": "Shows all tiles at the indicated depth layer.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_alpha",
    "signature": "tile_set_alpha(index, alpha)",
    "description": "Sets a tile's alpha (transparency).",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_background",
    "signature": "tile_set_background(index, background)",
    "description": "Sets the background for a tile to be drawn from.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_blend",
    "signature": "tile_set_blend(index, colour)",
    "description": "Sets a tile's blending.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_depth",
    "signature": "tile_set_depth(index, depth)",
    "description": "Sets a tile's depth.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_position",
    "signature": "tile_set_position(index, x, y)",
    "description": "Sets the position of a given tile.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_region",
    "signature": "tile_set_region(index, left, top, width, height)",
    "description": "Sets the region of its background a tile is taken from.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_scale",
    "signature": "tile_set_scale(index, xscale, yscale)",
    "description": "Sets a tile's horizontal and vertical scaling.",
    "category": "Game Assets"
  },
  {
    "name": "tile_set_visible",
    "signature": "tile_set_visible(index, visible)",
    "description": "Sets a tile's visibility.",
    "category": "Game Assets"
  },
  {
    "name": "timeline_add",
    "signature": "timeline_add()",
    "description": "Adds a new time line.",
    "category": "Timelines"
  },
  {
    "name": "timeline_clear",
    "signature": "timeline_clear(ind)",
    "description": "Clears the time line of all moments.",
    "category": "Timelines"
  },
  {
    "name": "timeline_delete",
    "signature": "timeline_delete( ind )",
    "description": "Deletes a given time line.",
    "category": "Timelines"
  },
  {
    "name": "timeline_exists",
    "signature": "timeline_exists(ind)",
    "description": "Checks if a given time line exists.",
    "category": "Timelines"
  },
  {
    "name": "timeline_get_name",
    "signature": "timeline_get_name( ind )",
    "description": "Gets the name of a given time line.",
    "category": "Timelines"
  },
  {
    "name": "timeline_max_moment",
    "signature": "timeline_max_moment(ind)",
    "description": "Gives you the maximum moment placed in a given timeline.",
    "category": "Timelines"
  },
  {
    "name": "timeline_moment_add_script",
    "signature": "timeline_moment_add_script(ind, step, script)",
    "description": "Adds a script to the time line at the given step.",
    "category": "Timelines"
  },
  {
    "name": "timeline_moment_clear",
    "signature": "timeline_moment_clear(ind, step)",
    "description": "Clears the given moment of a time line.",
    "category": "Timelines"
  },
  {
    "name": "timeline_size",
    "signature": "timeline_size(ind)",
    "description": "Returns the number of active moments from a given timeline.",
    "category": "Timelines"
  },
  {
    "name": "vertex_argb",
    "signature": "vertex_argb(buffer, argb)",
    "description": "Set the ARGB values for the vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_begin",
    "signature": "vertex_begin(buffer, format)",
    "description": "Begin the definition of a custom primitive.",
    "category": "Shaders"
  },
  {
    "name": "vertex_colour",
    "signature": "vertex_colour(buffer, colour, alpha)",
    "description": "Set the colour and alpha for the vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_create_buffer",
    "signature": "vertex_create_buffer()",
    "description": "Create a new vertex buffer.",
    "category": "Shaders"
  },
  {
    "name": "vertex_create_buffer_ext",
    "signature": "vertex_create_buffer_ext(size)",
    "description": "Create a vertex buffer of a given size.",
    "category": "Shaders"
  },
  {
    "name": "vertex_create_buffer_from_buffer",
    "signature": "vertex_create_buffer_from_buffer(buffer, format)",
    "description": "Create a vertex buffer from a regular buffer.",
    "category": "Shaders"
  },
  {
    "name": "vertex_create_buffer_from_buffer_ext",
    "signature": "vertex_create_buffer_from_buffer_ext(buffer, format, src_offset, vert_num)",
    "description": "Create a vertex buffer of a given size.",
    "category": "Shaders"
  },
  {
    "name": "vertex_delete_buffer",
    "signature": "vertex_delete_buffer(buffer)",
    "description": "Delete a vertex buffer from memory.",
    "category": "Shaders"
  },
  {
    "name": "vertex_end",
    "signature": "vertex_end(buffer)",
    "description": "Finish building the primitive.",
    "category": "Shaders"
  },
  {
    "name": "vertex_float1",
    "signature": "vertex_float1(buffer, float)",
    "description": "Add a floating point value to a vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_float2",
    "signature": "vertex_float2(buffer, float, float)",
    "description": "Add floating point values to a vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_float3",
    "signature": "vertex_float3(buffer, float, float, float)",
    "description": "Add floating point values to a vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_float4",
    "signature": "vertex_float4(buffer, float, float, float, float)",
    "description": "Add floating point values to a vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_add_colour",
    "signature": "vertex_format_add_colour()",
    "description": "Add colour data to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_add_custom",
    "signature": "vertex_format_add_custom(type, usage)",
    "description": "Add custom values to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_add_normal",
    "signature": "vertex_format_add_normal()",
    "description": "Add surface normal data to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_add_position",
    "signature": "vertex_format_add_position()",
    "description": "Add 2D position data to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_add_position_3d",
    "signature": "vertex_format_add_position_3d()",
    "description": "Add 3D position data to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_add_textcoord",
    "signature": "vertex_format_add_textcoord()",
    "description": "Add texture position data to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_begin",
    "signature": "vertex_format_begin()",
    "description": "Begin the definition of a custom vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_delete",
    "signature": "vertex_format_delete(formatID)",
    "description": "Remove a custom vertex format from memory.",
    "category": "Shaders"
  },
  {
    "name": "vertex_format_end",
    "signature": "vertex_format_end()",
    "description": "Add custom values to the vertex format.",
    "category": "Shaders"
  },
  {
    "name": "vertex_freeze",
    "signature": "vertex_freeze(buffer)",
    "description": "Freeze the given vertex buffer.",
    "category": "Shaders"
  },
  {
    "name": "vertex_get_buffer_size",
    "signature": "vertex_get_buffer_size(buffer)",
    "description": "Get the size - in bytes - of a given vertex buffer.",
    "category": "Shaders"
  },
  {
    "name": "vertex_get_number",
    "signature": "vertex_get_number(buffer)",
    "description": "Get the number of vertices in the given vertex buffer",
    "category": "Shaders"
  },
  {
    "name": "vertex_normal",
    "signature": "vertex_normal(buffer, nx, ny, nz)",
    "description": "Set the surface normal for the vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_position",
    "signature": "vertex_position(buffer, x, y)",
    "description": "Set the 2D position for the vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_position_3d",
    "signature": "vertex_position_3d(buffer, x, y, z)",
    "description": "Set the 3D position for the vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_submit",
    "signature": "vertex_submit(buffer, primitive, texture)",
    "description": "Freeze the given vertex buffer.",
    "category": "Shaders"
  },
  {
    "name": "vertex_texcoord",
    "signature": "vertex_texcoord(buffer, u, v)",
    "description": "Set UV coordinates for the texture being used for the vertex.",
    "category": "Shaders"
  },
  {
    "name": "vertex_ubyte4",
    "signature": "vertex_ubyte4(buffer, byte, byte, byte, byte)",
    "description": "Add four unsigned byte values to a vertex.",
    "category": "Shaders"
  },
  {
    "name": "virtual_key_add",
    "signature": "virtual_key_add(x, y, w, h, keycode)",
    "description": "Creates a virtual key with a set area and keycode, returning its id.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "virtual_key_delete",
    "signature": "virtual_key_delete(index)",
    "description": "Hides a given created virtual key previously shown on the screen of the device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "virtual_key_hide",
    "signature": "virtual_key_hide(index)",
    "description": "Hides a given created virtual key previously shown on the screen of the device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "virtual_key_show",
    "signature": "virtual_key_show(index)",
    "description": "Shows a given created virtual key on the screen of the device.",
    "category": "Mouse, Keyboard and Other Controls"
  },
  {
    "name": "window_center",
    "signature": "window_center()",
    "description": "Centers the region based on the viewable or browser area.",
    "category": "Windows And Views"
  },
  {
    "name": "window_device",
    "signature": "window_device()",
    "description": "Returns the current d3d device pointer.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_caption",
    "signature": "window_get_caption()",
    "description": "Returns the caption of the window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_colour",
    "signature": "window_get_colour()",
    "description": "Gets the colour of the region inside the window/browser but outside the visible views (default is black).",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_cursor",
    "signature": "window_get_cursor()",
    "description": "Gets the current cursor being used in the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_fullscreen",
    "signature": "window_get_fullscreen()",
    "description": "Returns whether the game is run in fullscreen or not.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_height",
    "signature": "window_get_height()",
    "description": "Gets the height of the window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_visible_rects",
    "signature": "window_get_visible_rects(x1, y1, x2, y2)",
    "description": "Find the overlapping region of the rectangle defined by (x1,y1) to (x2,y2) on each of the attached displays.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_width",
    "signature": "window_get_width()",
    "description": "Gets the width of the window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_x",
    "signature": "window_get_x()",
    "description": "Gets the x position of the window inside the browser/visible area of the screen.",
    "category": "Windows And Views"
  },
  {
    "name": "window_get_y",
    "signature": "window_get_y()",
    "description": "Gets the y position of the window inside the browser/visible area of the screen.",
    "category": "Windows And Views"
  },
  {
    "name": "window_handle",
    "signature": "window_handle()",
    "description": "Returns the id of the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_has_focus",
    "signature": "window_has_focus()",
    "description": "Returns if the game window is in focus or not.",
    "category": "Windows And Views"
  },
  {
    "name": "window_mouse_get_x",
    "signature": "window_mouse_get_x()",
    "description": "Returns the x coordinate of the mouse in the window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_mouse_get_y",
    "signature": "window_mouse_get_y()",
    "description": "Returns the y coordinate of the mouse in the window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_caption",
    "signature": "window_set_caption(caption)",
    "description": "Sets the caption of the window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_colour",
    "signature": "window_set_colour(colour)",
    "description": "Sets the colour of the region inside the game window but outside the visible views (default is black).",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_cursor",
    "signature": "window_set_cursor(cursor)",
    "description": "Sets the standard cursor for the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_fullscreen",
    "signature": "window_set_fullscreen(full)",
    "description": "Sets whether the game is run in fullscreen or not.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_max_height",
    "signature": "window_set_max_height(height)",
    "description": "Sets a maximum width for the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_max_width",
    "signature": "window_set_max_width(width)",
    "description": "Sets a maximum width for the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_min_height",
    "signature": "window_set_min_height(height)",
    "description": "Sets a minimum height for the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_min_width",
    "signature": "window_set_min_width(width)",
    "description": "Sets a minimum width for the game window.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_position",
    "signature": "window_set_position(x, y)",
    "description": "Sets the position of the window inside the browser/visible area of the screen.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_rectangle",
    "signature": "window_set_rectangle(x, y, w, h)",
    "description": "Sets the position and size of the window rectangle.",
    "category": "Windows And Views"
  },
  {
    "name": "window_set_size",
    "signature": "window_set_size( w, h )",
    "description": "Sets the size of the window in pixels.",
    "category": "Windows And Views"
  },
  {
    "name": "window_view_mouse_get_x",
    "signature": "window_view_mouse_get_x( id )",
    "description": "Returns the x coordinate of the mouse in the window with respect to the given view.",
    "category": "Windows And Views"
  },
  {
    "name": "window_view_mouse_get_y",
    "signature": "window_view_mouse_get_y( id )",
    "description": "Returns the y coordinate of the mouse in the window with respect to the given view.",
    "category": "Windows And Views"
  },
  {
    "name": "window_views_mouse_get_x",
    "signature": "window_views_mouse_get_x()",
    "description": "Returns the x-coordinate of the mouse with respect to the views.",
    "category": "Windows And Views"
  },
  {
    "name": "window_views_mouse_get_y",
    "signature": "window_views_mouse_get_y()",
    "description": "Returns the y-coordinate of the mouse with respect to the views.",
    "category": "Windows And Views"
  },
  {
    "name": "zip_unzip",
    "signature": "zip_unzip(zip_file, target_directory)",
    "description": "Unzip a given zip file to a specific location.",
    "category": "File Handling"
  }
]
